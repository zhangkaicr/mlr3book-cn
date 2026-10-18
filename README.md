# Applied Machine Learning Using mlr3 in R · 中文翻译版

《机器学习应用：基于 mlr3 的 R 实现》中文翻译（非官方，仅供学习交流）。

- **原文**：https://mlr3book.mlr-org.com/ （CRC Press, 2024；Bischl, Sonabend, Kotthoff & Lang 主编）
- **在线阅读**：https://zhangkaicr.github.io/mlr3book-cn/
- **全书搜索**：https://zhangkaicr.github.io/mlr3book-cn/search.html （任意页面按 `/` 聚焦搜索框）
- **翻译原则**：
  - 逐章完整翻译，代码块、控制台输出、公式、图表原样保留；
  - 术语首次出现标注英文原名，便于对照原文；
  - 每章增设「背景与解释（译者注）」框，补充方法论背景与易错点，方便中文读者理解。

## 阅读与检索

- **全文搜索**：顶栏搜索框支持全书 16 章正文与附录的 323 个小节、1570 段内容（不含代码块，避免噪声）。
  - 按 `/` 快速聚焦搜索框；`↑` `↓` 选择结果，`Enter` 跳转，`Esc` 清空；
  - 多个关键词用空格分隔，按「同时包含」匹配，例如 `超参数 搜索`；
  - 结果页链接可分享，如 `search.html?q=交叉验证`；
  - 点击结果直接跳转到对应章节的对应小节。
- **其它**：右上角可切换深色 / 浅色主题（记忆偏好）；每页底部有上一章 / 下一章导航。

## 章节

| 部分 | 章节 |
|---|---|
| 前言 | 第 1 章 绪论与概览 |
| 第一部分 基础 | 第 2 章 数据与基础建模、第 3 章 评估与基准测试 |
| 第二部分 调优与特征选择 | 第 4 章 超参数优化、第 5 章 高级调优方法与黑箱优化、第 6 章 特征选择 |
| 第三部分 管道与预处理 | 第 7 章 顺序管道、第 8 章 非顺序管道与调优、第 9 章 预处理 |
| 第四部分 高级专题 | 第 10 章 mlr3 高级技术方面、第 11 章 大规模基准测试、第 12 章 模型解释、第 13 章 回归与分类之外、第 14 章 算法公平性、第 15 章 预测集、验证与内部调优、第 16 章 使用 paradox 的高级超参数规范 |
| 附录 | 参考文献、习题解答、概览表、任务列表、勘误、会话信息 |

## 许可说明

- 原文正文文本、图表（非代码生成部分）：CC BY-NC-SA 4.0（© CRC Press / mlr-org）
- 原书代码块：MIT 许可
- 本中文译本仅作学习交流用途，请勿用于商业用途；引用请标注原书。

## 构建

翻译片段存放在 `chapters/*.frag.html`，由 `_tools/build_book.py` 装配为完整页面，`_tools/build_search_index.py` 生成 `search_index.json` 供前端检索。图片位于 `images/`。

站点为纯静态页面，无后端依赖；`search.js` 与 `search_index.json` 需与页面一同部署。

## 相关项目

- mlr3 官方文档：https://mlr3.mlr-org.com/
- mlr3 生态 gallery：https://mlr-org.com/gallery.html

## 📦 配套技能（WorkBuddy Skill）

把全书方法论蒸馏成了可直接安装的 WorkBuddy 技能 [`mlr3book-skill`](skills/mlr3book-skill/SKILL.md)，方便在对话中按「用 mlr3 做分类/调参/管道/特征选择/模型解释/生存分析/公平」等意图自动调用，每张能力卡都内嵌书中真实 R 代码并附在线章节链接。

- 技能目录：`skills/mlr3book-skill/`（`SKILL.md` + `DIGEST.md` + `INSTALL.md`）
- 安装方式见 [`skills/mlr3book-skill/INSTALL.md`](skills/mlr3book-skill/INSTALL.md)：软链或复制该目录到 `~/.workbuddy/skills/` 即可；推荐软链，仓库更新后技能自动同步。
- 在线安装：从 https://github.com/zhangkaicr/mlr3book-cn/tree/main/skills 取三个文件放入 `~/.workbuddy/skills/mlr3book-skill/`。
