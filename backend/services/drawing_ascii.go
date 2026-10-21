package services

// ASCII 栅格:把 0-1 相对坐标的笔画压成 96×72 字符画,作为审核 LLM 的
// 唯一输入。纯文本通道省 token 且可注入任意画布尺寸;宽>高是设计意图——
// 终端字符高约为宽的 2 倍,等比压扁后画布不变形。
//
// 这是纯函数:不碰 LLM、不碰 DB,方便表驱动测试。

import (
	"strings"
)

const (
	gridWidth  = 96
	gridHeight = 72
	// 用 []rune 保多级密度字符不被按字节切碎。
	densityRamp = " .:-=+*#%@"
)

// RasterizeStrokesToASCII 把笔画(相对坐标 0-1)渲染为 gridHeight 行
// ASCII 字符栅格,行间以 \n 连接。多笔共用同一栅格,越界坐标按边界截断;
// 单点笔画落实心点,不因长度为零被丢弃。
func RasterizeStrokesToASCII(strokes []DrawingStroke) string {
	grid := make([][]rune, gridHeight)
	for i := range grid {
		grid[i] = []rune(strings.Repeat(" ", gridWidth))
	}

	dot := rune(densityRamp[len(densityRamp)-1])
	for _, stroke := range strokes {
		if len(stroke.Points) == 0 {
			continue
		}
		if len(stroke.Points) == 1 {
			// 单点笔画:落实心点,与线段采样共用同一密度语义。
			x, y := clampGrid(stroke.Points[0].X, stroke.Points[0].Y)
			grid[y][x] = dot
			continue
		}
		for i := 0; i+1 < len(stroke.Points); i++ {
			drawGridSegment(grid, stroke.Points[i], stroke.Points[i+1])
		}
	}

	rows := make([]string, gridHeight)
	for i, row := range grid {
		rows[i] = string(row)
	}
	return strings.Join(rows, "\n")
}

// drawGridSegment 在栅格上用 Bresenham 连接两点:整数误差推进,不依赖
// 浮点插值,主轴方向每格必落,水平/垂直/斜线都不会因浮点截断出现缝隙。
// 落格字符按线长占画布宽度的比例在密度梯度上取档:短笔浅、长笔深,
// 满宽线正好落在 '#';最高档 '@' 保留给单点实心(见 RasterizeStrokesToASCII)。
func drawGridSegment(grid [][]rune, from, to DrawingPoint) {
	x0, y0 := clampGrid(from.X, from.Y)
	x1, y1 := clampGrid(to.X, to.Y)

	dx := absGrid(x1 - x0)
	dy := -absGrid(y1 - y0)
	steps := max(dx, -dy)
	// 密度档位:1..7('.'..'%'),按线长/画布宽度线性归一;封顶 '#'
	// 是为了把 '@' 让给单点实心,同时避免满屏深色干扰 OCR 转录。
	fraction := float64(steps) / float64(gridWidth-1)
	if fraction > 1 {
		fraction = 1
	}
	runeIndex := clampInt(1+int(fraction*6), 1, 7)
	ch := rune(densityRamp[runeIndex])

	stepX := 1
	if x0 >= x1 {
		stepX = -1
	}
	stepY := 1
	if y0 >= y1 {
		stepY = -1
	}
	errTerm := dx + dy
	x, y := x0, y0
	for {
		grid[y][x] = ch
		if x == x1 && y == y1 {
			break
		}
		e2 := 2 * errTerm
		if e2 >= dy {
			errTerm += dy
			x += stepX
		}
		if e2 <= dx {
			errTerm += dx
			y += stepY
		}
	}
}

// clampGrid 把相对坐标(0-1)映射到栅格下标并截断到边界,越界不 panic。
func clampGrid(x, y float64) (int, int) {
	col := clampInt(int(x*float64(gridWidth)), 0, gridWidth-1)
	row := clampInt(int(y*float64(gridHeight)), 0, gridHeight-1)
	return col, row
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func absGrid(v int) int {
	if v < 0 {
		return -v
	}
	return v
}
