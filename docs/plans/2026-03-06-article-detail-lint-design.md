# ArticleDetail Lint Cleanup Design

**背景**

`frontend/src/components/ArticleDetail.jsx` 当前存在 5 个 ESLint error 和 2 个 React Hooks warning。问题集中在未使用变量、正则表达式冗余转义，以及 `useEffect` 依赖不稳定。

**目标**

在不改变页面可见行为的前提下，消除这 7 个 lint 问题，并补一个最小回归测试覆盖文章加载与分享降级路径。

**方案对比**

1. 推荐方案：补最小回归测试，再将异步获取函数稳定化，最后清理未使用变量。
   优点：技术债最低，`exhaustive-deps` 按规则修复，后续重构更安全。
   缺点：比直接改代码多一个测试文件。

2. 快速方案：仅删除未使用变量，针对 Hook 警告通过忽略规则或内联禁用解决。
   优点：改动最少。
   缺点：留下依赖不稳定问题，后续容易回归。

3. 重构方案：拆出 `useArticleDetail` 自定义 Hook，页面只负责渲染。
   优点：结构更清晰。
   缺点：对当前问题属于过度设计，风险和改动范围都更大。

**采用方案**

采用方案 1。

**设计**

1. 测试层：
   新增 `frontend/src/components/ArticleDetail.test.jsx`，验证：
   - 首次渲染会根据路由参数请求文章详情并展示标题。
   - 点击分享按钮时，在不支持 `navigator.share` 的环境下会回退到复制链接。

2. 实现层：
   - 删除未使用的 `motion` 导入，改用现有 `Box` 作为容器，保留原动画样式外观但不再依赖无用导入。
   - 将 `stripMarkdown` 中字符类的 `\-` 改为 `-`，消除冗余转义。
   - 移除 `CodeBlock` 中未使用的 `node` 解构。
   - 将 `fetchArticle`、`fetchComments` 包装为稳定引用，并让 `useEffect` 使用真实依赖。
   - 删除未使用的错误变量和分享文本临时变量。

3. 风险控制：
   - 不修改 API 地址生成逻辑。
   - 不调整评论提交和渲染结构。
   - 只在 lint 指向的问题附近做最小改动。
