package routes

// 公共画布(Game Drawing)公共 GET/POST 与管理端投稿审核路由。
//
// 鉴权仿 comment.go 的 commentSessionUser(可选 Bearer,匿名→nil→401);
// 限流仿 login 的包级 limiter(依赖注入,测试整体替换);审核链在
// services 包,经 services.ModerateDrawingForRoutes 调用,测试打桩替换。

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/handywote/website/config"
	"github.com/handywote/website/middleware"
	"github.com/handywote/website/models"
	"github.com/handywote/website/ratelimit"
	"github.com/handywote/website/repositories"
	"github.com/handywote/website/services"
	"github.com/handywote/website/utils"
	"gorm.io/gorm"
)

// 画布投稿输入上限(与契约冻结一致,服务端独立校验函数 + 表驱动测试)。
const (
	drawingMaxStrokes      = 2000
	drawingMaxPointsPer    = 4000
	drawingMaxColorLen     = 32
	drawingMaxIDLen        = 64
	drawingSubmissionLimit = 50
)

// drawingModerationLimiter 审核限流器(语义:审核 LLM 成本防护),按 cfg 的
// DrawingModerationRateLimitMax/Window 实例化,默认禁用(未走 configureServices
// 时),测试可整体替换以注入可控时钟(模式同 loginLimiter)。
var drawingModerationLimiter = ratelimit.New(0, 0, nil)

// drawingRepo 默认走真实仓库;测试可整体替换以注入独立内存库。admin 审核端
// 与公共端共用仓库(独立变量便于将来拆分注入)。
var drawingRepo *repositories.DrawingRepository = repositories.NewDrawingRepository()

// drawingAdminRepo admin 审核端引用同一仓库实例。
var drawingAdminRepo = drawingRepo

// servicesDrawingModeration 审核链入口(routes 侧可替换变量):默认指向
// services.ModerateDrawingForRoutes;测试整体替换打桩,避免真实 LLM 调用
// (模式同 githubUserUpserter / meUserLookup)。
var servicesDrawingModeration = services.ModerateDrawingForRoutes

// drawingSessionUser 解析画布投稿的会话身份,逻辑与 commentSessionUser 一致:
// 无 Authorization / 非 Bearer / 解析失败 → nil;github → 尽力查 users 表补全
// (查不到回退 claims.Username);password(含旧 token)→ 管理员。独立函数而非
// 复用 commentSessionUser,让两处提示文案与将来演进互不牵连。
func drawingSessionUser(c *gin.Context) *models.User {
	authHeader := c.GetHeader("Authorization")
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader || tokenString == "" {
		return nil
	}

	cfg := config.LoadConfig()
	claims := &middleware.Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(cfg.JWTSecretKey), nil
	})
	if err != nil || !token.Valid {
		return nil
	}

	switch claims.Provider {
	case "github":
		user, lookupErr := meUserLookup(c.Request.Context(), claims.Provider, claims.Username)
		if lookupErr != nil {
			return nil
		}
		if user == nil {
			// users 表查不到:JWT 本身可信,回退 claims.Username。
			return &models.User{Provider: "github", Username: claims.Username}
		}
		return user
	default:
		// 旧 token(无 provider 字段)按 "password" 兼容,与 middleware.JWTAuth 一致。
		return &models.User{Provider: "password", Username: cfg.AdminUsername, DisplayName: cfg.AdminUsername}
	}
}

// validateDrawingStrokes 服务端独立校验函数(表驱动测试锁定):笔画 1..2000,
// 每笔 id 非空≤64、color 非空≤32、width∈(0,1] 有限,点 1..4000 且
// x,y∈[0,1] 有限。
func validateDrawingStrokes(strokes []services.DrawingStroke) bool {
	if len(strokes) == 0 || len(strokes) > drawingMaxStrokes {
		return false
	}
	for _, stroke := range strokes {
		if strings.TrimSpace(stroke.ID) == "" || len(stroke.ID) > drawingMaxIDLen {
			return false
		}
		if strings.TrimSpace(stroke.Color) == "" || len(stroke.Color) > drawingMaxColorLen {
			return false
		}
		if stroke.Width <= 0 || stroke.Width > 1 || math.IsNaN(stroke.Width) || math.IsInf(stroke.Width, 0) {
			return false
		}
		if len(stroke.Points) == 0 || len(stroke.Points) > drawingMaxPointsPer {
			return false
		}
		for _, p := range stroke.Points {
			if math.IsNaN(p.X) || math.IsInf(p.X, 0) || p.X < 0 || p.X > 1 {
				return false
			}
			if math.IsNaN(p.Y) || math.IsInf(p.Y, 0) || p.Y < 0 || p.Y > 1 {
				return false
			}
		}
	}
	return true
}

// GetDrawingCanvas 返回画布当前版本全量笔画。空画布 version=0、strokes 空。
func GetDrawingCanvas(c *gin.Context) {
	version, err := drawingRepo.CurrentVersion(c.Request.Context())
	if err != nil {
		utils.ErrorInternal(c, "Failed to load canvas")
		return
	}
	strokes := json.RawMessage(version.Strokes)
	if strings.TrimSpace(version.Strokes) == "" {
		strokes = json.RawMessage("[]")
	}
	utils.Success(c, gin.H{
		"version":    version.Version,
		"strokes":    strokes,
		"updated_at": version.UpdatedAt,
	})
}

// drawingSubmitInput 是 POST canvas 的请求体契约:strokes 走服务层类型
// (结构一致),校验独立函数兜底。
type drawingSubmitInput struct {
	BaseVersion uint                     `json:"base_version"`
	Strokes     []services.DrawingStroke `json:"strokes"`
}

// mergeStrokesForModeration 把画布存量快照(currentJSON,空画布传 "[]")与
// 本次新增合并为审核输入;routes 侧不得依赖 repositories 的内部合并实现,
// 这里独立反序列化拼接。审核输入与 Clean 直发路径 AppendStrokes 产出的
// merged(内部同语义合并)天然一致。
func mergeStrokesForModeration(currentJSON string, incoming []services.DrawingStroke) ([]services.DrawingStroke, error) {
	existing := []services.DrawingStroke{}
	if strings.TrimSpace(currentJSON) != "" {
		if err := json.Unmarshal([]byte(currentJSON), &existing); err != nil {
			return nil, fmt.Errorf("parse existing strokes: %w", err)
		}
	}
	return append(existing, incoming...), nil
}

// CreateDrawingCanvas 提交增量笔画。流程:登录→校验→限流→审核链→发布或
// 转人工。版本冲突不预检:AppendStrokes 以 base_version 单语句条件插入原子
// 仲裁,消除「先读再比」窗口内画布被并发推进导致的假通过;审核通过但画布已
// 推进 → 409,前端已有重拉重提逻辑。
//
// 限流语义(审核成本防护):每次「真实触发审核 LLM 调用」计一次
// RecordFailure,超限直接 429 不再调 LLM;词表/校验等纯本地步骤不计数;
// 429 的请求不消耗额度(被拒在门口)。审核通过/转人工/拒绝都已真实消耗
// LLM 或本应消耗,统一计一次;base 过期等写入失败不计数(没花审核成本)。
// pending 路径投稿只存本次增量,契约(202 响应形状)不变;审核通过时由
// ApproveSubmission 以画布现值整行为合并基线,与这里的审核输入同源一致。
func CreateDrawingCanvas(c *gin.Context) {
	// 会话鉴权在限流/校验/入库之前:未登录一律 401。
	identity := drawingSessionUser(c)
	if identity == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录后再提交"})
		return
	}
	createdBy := identity.Username
	if createdBy == "" {
		createdBy = identity.DisplayName
	}

	var input drawingSubmitInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid strokes"})
		return
	}
	if !validateDrawingStrokes(input.Strokes) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid strokes"})
		return
	}

	// 限流检查在审核 LLM 调用之前:超限 429,不调 LLM 也不计数。
	key := "ip:" + c.ClientIP()
	if drawingModerationLimiter.IsBlocked(key) {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "提交过于频繁,请稍后再试"})
		return
	}

	// 审核输入 = 画布存量+本次新增的整体快照(工单 #9):发布内容等于审核
	// 所见,存量旧笔画不再游离在审核链之外。空画布(version=0)存量即空数组。
	current, err := drawingRepo.CurrentVersion(c.Request.Context())
	if err != nil {
		utils.ErrorInternal(c, "Failed to load canvas")
		return
	}
	moderationStrokes, err := mergeStrokesForModeration(current.Strokes, input.Strokes)
	if err != nil {
		utils.ErrorInternal(c, "Failed to encode strokes")
		return
	}

	verdict, reason, err := servicesDrawingModeration(c.Request.Context(), moderationStrokes)
	if err != nil {
		// 审核链内部错误(不该发生,链路自身吞错转 pending),按内部错误兜底。
		utils.ErrorInternal(c, "Moderation failed")
		return
	}
	// 真实触发了审核链:计一次额度(通过/转人工/拒绝同价,语义是 LLM 成本)。
	drawingModerationLimiter.RecordFailure(key)

	strokesJSON, err := json.Marshal(input.Strokes)
	if err != nil {
		utils.ErrorInternal(c, "Failed to encode strokes")
		return
	}

	switch verdict {
	case services.DrawingViolation:
		// 图形违规:422,不落库任何表。
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "rejected", "reason": "graphic"})
	case services.DrawingOCRHit:
		// OCR 词表命中:422,不落库。
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "rejected", "reason": "ocr"})
	case services.DrawingClean:
		// 全清:发布,追加进画布新版本。base_version 由写入原子仲裁:画布
		// 已被并发推进 → 409 附 current_version 供前端重拉(读现值仅用于
		// 提示,极小概率读时又变,可接受,契约字段仍在)。
		version, err := drawingRepo.AppendStrokes(c.Request.Context(), input.BaseVersion, string(strokesJSON), createdBy)
		if err != nil {
			if errors.Is(err, repositories.ErrDrawingVersionConflict) {
				currentVersion := uint(0)
				if current, loadErr := drawingRepo.CurrentVersion(c.Request.Context()); loadErr == nil {
					currentVersion = current.Version
				}
				c.JSON(http.StatusConflict, gin.H{"error": "version conflict", "current_version": currentVersion})
				return
			}
			utils.ErrorInternal(c, "Failed to save canvas")
			return
		}
		utils.Success(c, gin.H{"version": version.Version, "status": "published"})
	default: // DrawingPending
		// 任一通道不确定(含 LLM 未配置/响应不可解析):落 pending 人工审。
		// base_version 只作记录:审核通过时由 ApproveSubmission 对画布现值仲裁。
		submission := models.DrawingSubmission{
			BaseVersion: input.BaseVersion,
			Strokes:     string(strokesJSON),
			Status:      "pending",
			Reason:      reason,
			CreatedBy:   createdBy,
		}
		if err := drawingRepo.CreateSubmission(c.Request.Context(), &submission); err != nil {
			utils.ErrorInternal(c, "Failed to save submission")
			return
		}
		c.JSON(http.StatusAccepted, gin.H{"code": 0, "data": gin.H{"status": "pending", "submission_id": submission.ID}})
	}
}

// AdminListDrawingSubmissions 待审投稿列表(管理端)。
func AdminListDrawingSubmissions(c *gin.Context) {
	status := strings.TrimSpace(c.Query("status"))
	limit, err := strconv.Atoi(c.DefaultQuery("limit", strconv.Itoa(drawingSubmissionLimit)))
	if err != nil || limit <= 0 {
		limit = drawingSubmissionLimit
	}

	submissions, total, listErr := drawingAdminRepo.ListSubmissions(c.Request.Context(), status, limit)
	if listErr != nil {
		utils.ErrorInternal(c, "Failed to list submissions")
		return
	}
	utils.Success(c, gin.H{"submissions": submissions, "total": total})
}

// AdminApproveDrawingSubmission 通过投稿:仓库层单事务原子完成 pending 校验、
// base 版本仲裁、画布发布与状态推进,消除「画布已发布但投稿仍 pending」的
// 半发布态与并发重复发布。错误映射(契约不变):
//   - 投稿不存在 → 404;已审核/重复 approve → 400;
//   - base 落后或写入仲裁时画布被并发推进 → 409(后者投稿保持 pending,
//     重审时走正式 superseded 分支)。
func AdminApproveDrawingSubmission(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}
	reviewer := drawingAdminIdentity(c)

	// 预读仅用于快速失败提示与取 base_version;真正的仲裁在事务内,被并发
	// 抢先时事务仍会给出同样的 400/409。
	submission, err := drawingAdminRepo.GetSubmission(c.Request.Context(), id)
	if err != nil {
		utils.ErrorNotFound(c, "Submission not found")
		return
	}
	if submission.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "submission already reviewed"})
		return
	}

	approved, err := drawingAdminRepo.ApproveSubmission(c.Request.Context(), id, submission.BaseVersion, reviewer)
	switch {
	case err == nil:
	case errors.Is(err, gorm.ErrRecordNotFound):
		utils.ErrorNotFound(c, "Submission not found")
		return
	case errors.Is(err, repositories.ErrDrawingSubmissionNotPending):
		c.JSON(http.StatusBadRequest, gin.H{"error": "submission already reviewed"})
		return
	case errors.Is(err, repositories.ErrDrawingBaseSuperseded), errors.Is(err, repositories.ErrDrawingVersionConflict):
		c.JSON(http.StatusConflict, gin.H{"error": "base version superseded", "data": gin.H{"status": "superseded"}})
		return
	default:
		utils.ErrorInternal(c, "Failed to approve submission")
		return
	}
	utils.Success(c, gin.H{"id": approved.ID, "status": approved.Status})
}

// AdminRejectDrawingSubmission 拒绝投稿:仅 pending 可拒,重复审核 400。
func AdminRejectDrawingSubmission(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}
	reviewer := drawingAdminIdentity(c)

	submission, err := drawingAdminRepo.GetSubmission(c.Request.Context(), id)
	if err != nil {
		utils.ErrorNotFound(c, "Submission not found")
		return
	}
	if submission.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "submission already reviewed"})
		return
	}
	if err := drawingAdminRepo.UpdateSubmissionStatus(c.Request.Context(), id, "rejected", reviewer, time.Now()); err != nil {
		utils.ErrorInternal(c, "Failed to update submission")
		return
	}
	utils.Success(c, gin.H{"id": submission.ID, "status": "rejected"})
}

// drawingAdminIdentity 从 JWT 中间件取当前管理员用户名(JWTAuth 已注入)。
func drawingAdminIdentity(c *gin.Context) string {
	username, _ := c.Get("username")
	name, _ := username.(string)
	return name
}
