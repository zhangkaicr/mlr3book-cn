# 安装 mlr3book-skill

本技能由《Applied Machine Learning Using mlr3 in R》中文翻译版（mlr3book-cn）蒸馏而来，覆盖 mlr3 生态的建模、评估、调优、管道、特征选择、预处理、模型解释与特殊任务。

## 1. 安装

### 方式 A：从 GitHub 克隆仓库后软链（推荐，自动同步更新）

```bash
# 技能源目录（仓库内）
SKILL_SRC="$(pwd)/skills/mlr3book-skill"   # 在 mlr3book-cn 仓库根目录执行
ln -s "$SKILL_SRC" "$HOME/.workbuddy/skills/mlr3book-skill"
```

### 方式 B：直接复制目录

```bash
cp -r skills/mlr3book-skill "$HOME/.workbuddy/skills/mlr3book-skill"
```

### 方式 C：从线上仓库直接取三个文件

```bash
mkdir -p "$HOME/.workbuddy/skills/mlr3book-skill"
base="https://raw.githubusercontent.com/zhangkaicr/mlr3book-cn/main/skills/mlr3book-skill"
for f in SKILL.md DIGEST.md INSTALL.md; do
  curl -fsSL "$base/$f" -o "$HOME/.workbuddy/skills/mlr3book-skill/$f"
done
```

安装后重启/刷新 WorkBuddy，对话中提到「用 mlr3 做分类/调参/管道/模型解释」等即可自动加载。

## 2. 依赖（技能只会生成代码，运行在用户 R 环境）

技能本身零依赖；其生成的 R 代码需要：

- R ≥ 4.0
- `mlr3verse`（元包，含 mlr3 / mlr3tuning / mlr3pipelines / mlr3fselect / mlr3filters 等）
- 按需：`mlr3proba`（生存）、`mlr3fairness`（公平）、`DALEX` + `DALEXtra`（解释）、`mlr3hyperband`（Successive Halving）、`mlr3inferr`（置信区间）

一键安装：

```r
install.packages("mlr3verse")
# 其余扩展包按需：
# remotes::install_github("mlr-org/mlr3proba") 等，或参见 mlr3book 在线版「相关项目」
```

## 3. 在线资源

- 全书在线阅读：https://zhangkaicr.github.io/mlr3book-cn/
- 全书搜索：https://zhangkaicr.github.io/mlr3book-cn/search.html
- 原书（英文）：https://mlr3book.mlr-org.com/
- mlr3 官方文档：https://mlr3.mlr-org.com/

## 4. 许可

- 原书正文：CC BY-NC-SA 4.0（© CRC Press / mlr-org）
- 原书代码：MIT
- 本中文译本及蒸馏技能：学习交流用途，引用请标注原书与译者。
