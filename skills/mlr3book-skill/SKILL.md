---
name: mlr3book-skill
description: |
  R 机器学习实操（mlr3 生态）：Task/Learner 建模、resample/benchmark 评估、to_tune/tune 调优、PipeOp 管道、特征选择、预处理(编码/缺失/robustify)、DALEX 模型解释、生存/代价敏感/公平。

  何时调用：用户要"用 mlr3 做分类/回归/调参/基准/管道/特征选择/模型解释/生存分析/公平"，或代码含 mlr3、lrn()、tsk()、resample、benchmark、tune、PipeOp、flt、DALEX。

  何时不调用：(1) Python sklearn/ML；(2) 纯统计推断；(3) 深度学习 torch/keras 为主。
source_book: 《Applied Machine Learning Using mlr3 in R》（中文翻译版 mlr3book-cn，Bischl et al. 2024，zhangkaicr 译 2026）
source_chapter: 综合（全书 16 章 + 附录蒸馏）
tags:
  - 机器学习
  - mlr3
  - R语言
  - 超参数调优
  - 管道
  - 特征选择
  - 模型解释
  - 基准测试
  - 生存分析
  - 算法公平
related_skills:
  - causal-forest-skill
---

# mlr3book-skill — mlr3 机器学习实操技能

> 本技能由《Applied Machine Learning Using mlr3 in R》中文翻译版（mlr3book-cn）蒸馏而来。
> 所有 R 代码均取自书中真实示例；每张卡片末尾附「在线深入阅读」链接（指向已部署的 GitHub Pages 对应章节）。
> 在线全书：https://zhangkaicr.github.io/mlr3book-cn/

## 核心心智模型（先读）

mlr3 把机器学习建模拆成几个**不可变、可组合**的对象：

- **Task**（`tsk()`）：数据 + 目标列 + 角色（特征/目标/权重…），与算法解耦。
- **Learner**（`lrn()`）：统一接口的算法封装（`$train()` / `$predict()`）。
- **Resampling**（`rsmp()`）：如何切分训练/测试（cv / holdout / bootstrap…）。
- **Measure**（`msr()`）：用什么指标评估（`classif.acc` / `regr.mse`…）。
- **Graph / PipeOp**（`po()` / `%>>%` / `gunion()`）：把预处理与学习器串成可重用的图。
- **Tuner / Terminator**（`tnr()` / `trm()`）：超参搜索策略与停止准则。

记住一句话：**先 Task，再 Learner，加 Resampling 做评估，用 Graph 做流水，用 tune 做优化**。下面八张卡分别展开。

---

## C01 — 基础建模：Task + Learner + train/predict

**R（原则）**
mlr3 的建模最小闭环是「造 Task → 选 Learner → `$train()` → `$predict()`」。数据永远包在 Task 里，算法通过统一接口操作 Task，因此同一段代码可以无缝替换任意学习器。

**I（输入）**
- 一份带目标列的 `data.frame` / `data.table`，或内置示例任务（如 `tsk("penguins")`）。
- 要解决的问题类型：分类（`classif.*`）或回归（`regr.*`）。

**A1（适用场景）**
- 快速试跑一个基线模型；比较不同学习器在同一任务上的表现。
- 需要模型对象做后续解释、集成或部署。

**A2（不适用 / 与相邻卡区分）**
- 仅想做统计推断（如 `lm()` 拿 p 值）→ 不必用 mlr3。
- 需要超参优化见 C03；需要预处理流水线见 C04/C06。

**E（执行步骤 + 真实代码）**
```r
library(mlr3)
# 1) 取任务并划分训练/测试
task = tsk("penguins")
split = partition(task)                 # 默认 2/3 训练、1/3 测试
# 2) 选学习器（分类树）
learner = lrn("classif.rpart")
# 3) 训练
learner$train(task, row_ids = split$train)
learner$model                           # 查看底层 rpart 模型
# 4) 预测并评估
prediction = learner$predict(task, row_ids = split$test)
prediction$score(msr("classif.acc"))    # 准确率
```
回归同理：`tsk("mtcars")` + `lrn("regr.rpart")`，用 `msr("regr.mse")` 评分。`Learner` 的元数据（`$param_set`、`$predict_types`、`$properties`）决定了它能做什么——换学习器只需改 `lrn("...")` 一行。

**B（回到原则）**
Task 与 Learner 解耦是 mlr3 一切组合能力（调优、管道、基准）的基石。永远先把数据装进 Task，再谈算法。

> 📖 在线深入：https://zhangkaicr.github.io/mlr3book-cn/chapters/ch02-data-basic-modeling.html

---

## C02 — 评估与基准测试：resample / benchmark

**R（原则）**
单次 `predict` 的得分有随机性；**重采样（resampling）**用多折重复估计性能与不确定性，**基准测试（benchmark）**把多学习器 × 多任务 × 多重采样放在同一网格里公平比较。

**I（输入）**
- 已建好的 `Task` 与若干 `Learner`。
- 重采样策略（`rsmp("cv", folds = 10)`、`rsmp("repeated_cv")`）与指标（`msr()`）。

**A1（适用场景）**
- 报告「模型准确率 ± 波动」，而非单次数字。
- 公平比较 k 个算法在 n 个数据集上的表现（含基线 `classif.featureless`）。

**A2（不适用 / 区分）**
- 只想要一个最终模型的预测 → 用 C01。
- 比较的是超参配置而非算法 → 用 C03。

**E（执行步骤 + 真实代码）**
```r
library(mlr3)
tsk_penguins = tsk("penguins")
lrn_rpart = lrn("classif.rpart")
# 10 折交叉验证
rr = resample(tsk_penguins, lrn_rpart, rsmp("cv", folds = 10))
rr$aggregate(msr("classif.acc"))                  # 聚合得分
# 带置信区间（需 mlr3inferr）
library(mlr3inferr)
rr$aggregate(msr("ci.wald_cv", msr("classif.acc")))

# 多学习器 × 多任务 基准
library(mlr3verse)
design = benchmark_grid(
  tsks(c("sonar", "penguins")),
  lrns(c("classif.featureless", "classif.rpart")),
  rsmp("cv", folds = 3)
)
bmr = benchmark(design)
bmr$aggregate(msr("classif.acc"))                 # 每个组合一行
```
可视化：`autoplot(rr, measure = msr("classif.acc"), type = "boxplot")`。

**B（回到原则）**
评估必须带重采样与不确定性，基准必须把所有被比较对象塞进同一个 `benchmark_grid`，否则数字不可比。

> 📖 在线深入：https://zhangkaicr.github.io/mlr3book-cn/chapters/ch03-evaluation-benchmarking.html

---

## C03 — 超参数调优：to_tune / tune / auto_tuner

**R（原则）**
把「想优化的参数」用 `to_tune()` 标记，构造 **Tuning Instance**（`ti()`），交给 **Tuner**（`tnr()`）在 **Terminator**（`trm()`）决定的预算内搜索，最后把最优参数写回学习器。

**I（输入）**
- 带 `to_tune()` 标记参数的 `Learner`。
- 搜索空间（范围/整数/对数尺度）、调优器（网格/随机/贝叶斯 `mlr3mbo`）、停止准则、评估用的重采样与指标。

**A1（适用场景）**
- SVM 的 `cost`/`gamma`、树的 `cp`/`maxdepth`、XGBoost 等需搜索的超参。
- 把「调好参的学习器」作为新 Learner 嵌入管道或基准（`auto_tuner`）。

**A2（不适用 / 区分）**
- 参数无需优化（用默认值即可）→ 直接用 C01/C02。
- 优化的是**特征子集**而非超参 → 用 C05（特征选择）。

**E（执行步骤 + 真实代码）**
```r
library(mlr3tuning); library(mlr3verse)
# 1) 标记待调超参
learner = lrn("classif.svm",
  type   = "C-classification",
  kernel = "radial",
  cost   = to_tune(1e-1, 1e5),
  gamma  = to_tune(1e-1, 1)
)
# 2) 构造调优实例
instance = ti(
  task        = tsk("sonar"),
  learner     = learner,
  resampling  = rsmp("cv", folds = 3),
  measures    = msr("classif.ce"),
  terminator  = trm("evals", n_evals = 20)        # 或用 trm("none")
)
# 3) 跑调优器
tuner = tnr("random_search", batch_size = 12)
tuner$optimize(instance)
instance$result_learner_param_vals                  # 最优参数
learner$param_set$values = instance$result_learner_param_vals

# 4) 把调优封装成「自动调参学习器」，可直接进 resample/benchmark
at = auto_tuner(
  tnr("random_search", batch_size = 2),
  lrn("classif.rpart", minsplit = to_tune(2, 128)),
  rsmp("holdout"), msr("classif.ce"), term_evals = 20
)
resample(tsk("penguins"), at, rsmp("cv", folds = 5))
```
注意：含 `to_tune(p_int(..., tags = "budget"))` 的参数可被 `mlr3hyperband` 当作预算维度做 Successive Halving。

**B（回到原则）**
调优 = 搜索空间 + 调优器 + 终止条件 + 评估协议；用 `auto_tuner` 把调优「压平」成一个 Learner，才能无痛接入后续流程。

> 📖 在线深入：https://zhangkaicr.github.io/mlr3book-cn/chapters/ch04-hyperparameter-optimization.html

---

## C04 — 管道与图：PipeOp / Graph

**R（原则）**
`PipeOp`（简写 `po()`）是「对 Task 做一步变换」的可训练算子；用 `%>>%` 串联、`gunion()` 并联、`ppl()` 调用预置图、`as_learner()` 把图压成 Learner，从而得到**可重采样、可调优、可基准**的整个预处理+建模流水线。

**I（输入）**
- 一个或多个 `PipeOp`（如 `po("scale")`、`po("pca")`、`po("imputemedian")`）。
- 末端接一个 `Learner`（或一个 learner PipeOp）。

**A1（适用场景）**
- 标准化、PCA、缺失值填补、独热编码等必须**在每次重采样内重新拟合**的预处理。
- 分支/集成（bagging、stacking、特征联合 `featureunion`）。

**A2（不适用 / 区分）**
- 只是单次 `scale()` 数据框 → 用 base R 即可，不必上 PipeOp。
- 编码/缺失填补的完整配方见 C06；仅调参见 C03。

**E（执行步骤 + 真实代码）**
```r
library(mlr3pipelines)
# 串联：构造特征 → 标准化
graph = po("mutate",
  mutation = list(bill_ratio = ~bill_length / bill_depth)) %>>%
  po("scale")
graph$plot(horizontal = TRUE)

# 并联后合并特征（两条路径各自变换再 union）
sel_bill = selector_grep("^bill")
graph2 = gunion(list(
  po("select", id = "s_bill",  selector = sel_bill) %>>% po("pca"),
  po("select", id = "s_rest",  selector = selector_invert(sel_bill)) %>>% po("scale")
)) %>>% po("featureunion")
graph2$plot(horizontal = TRUE)

# 压成可训练 Learner，直接进 benchmark
glrn = as_learner(graph %>>% lrn("classif.rpart"))
```
预置图：`ppl("robustify")`（自动处理缺失/因子/常数）、`ppl("stacking", ...)`、`ppl("greplicate", ...)` 做复制集成。

**B（回到原则）**
凡是「预处理」都应该进 Graph 而非在训练前手动做，否则会数据泄露；`as_learner()` 让整条流水线获得与普通 Learner 完全一样的接口。

> 📖 在线深入：https://zhangkaicr.github.io/mlr3book-cn/chapters/ch07-sequential-pipelines.html

---

## C05 — 特征选择：filter + wrapper

**R（原则）**
特征选择分两类：**过滤法（filter）**用统计量对特征独立打分；**包装法（wrapper / fselect）**把「选哪些特征」本身当作被优化的对象，用学习器性能驱动搜索。

**I（输入）**
- `Task` 与候选特征集。
- 过滤方法（`flt("information_gain")` 等）或包装搜索器（`fs("sequential")` / `fs("random_search")`）。

**A1（适用场景）**
- 维度高、想降维提速或去噪。
- 想要「在给定学习器上表现最好」的子集（wrapper），或把选择嵌进训练（`auto_fselector`）。

**A2（不适用 / 区分）**
- 想做的是超参调优 → C03。
- 想做的是编码/缺失等确定性变换 → C06。

**E（执行步骤 + 真实代码）**
```r
# 过滤法：直接给特征打分
library(mlr3filters)
flt("information_gain")$calculate(tsk("penguins"))$scores

# 包装法：以准确率为目标搜索特征子集
library(mlr3fselect)
instance = fselect(
  fselector  = fs("sequential"),
  task       = tsk("penguins"),
  learner    = lrn("classif.rpart"),
  resampling = rsmp("cv", folds = 3),
  measure    = msr("classif.acc")
)
tsk("penguins")$select(instance$result_feature_set)   # 应用最优子集

# 把选择嵌进学习器（每次重采样内重选）
afs = auto_fselector(
  fselector  = fs("random_search"),
  learner    = lrn("classif.log_reg"),
  resampling = rsmp("holdout"),
  measure    = msr("classif.acc"),
  terminator = trm("evals", n_evals = 10)
)
```
学习器自身重要性：`lrn("classif.ranger", importance = "impurity")$train(tsk)$importance()`。

**B（回到原则）**
过滤快但忽略特征间交互；包装准但贵。需要「选择」随模型重拟合时，用 `auto_fselector` 把它封进 Learner。

> 📖 在线深入：https://zhangkaicr.github.io/mlr3book-cn/chapters/ch06-feature-selection.html

---

## C06 — 预处理配方：编码 / 缺失 / robustify

**R（原则）**
真实数据常有因子、缺失值、常数列。**永远在 Graph 内**完成预处理，并用 `selector_*` 按列类型/基数精确控制作用范围，避免数据泄露与「新因子水平」错误。

**I（输入）**
- 含 `factor`、缺失值或非数值列的 `Task`（如 `mlr3data::ames_housing`）。
- 编码策略（one-hot / impact / treatment）、填补策略（hist / oor / median）。

**A1（适用场景）**
- 树模型不支持因子 → 编码；线性/距离模型需要数值 → 编码+标准化。
- 缺失值处理；高基数分类变量的高效编码。

**A2（不适用 / 区分）**
- 仅做顺序管道（scale/PCA）→ C04。
- 选择特征子集 → C05。

**E（执行步骤 + 真实代码）**
```r
library(mlr3pipelines); library(mlr3verse)
# 因子处理配方：去常数 → 折叠稀有水平 → 高基数 impact 编码 → 低基数 one-hot → 二元 treatment
factor_pipeline =
  po("removeconstants") %>>%
  po("collapsefactors", no_collapse_above_prevalence = 0.01) %>>%
  po("encodeimpact", affect_columns = selector_cardinality_greater_than(10), id = "hi") %>>%
  po("encode", method = "one-hot", affect_columns = selector_cardinality_greater_than(2), id = "lo") %>>%
  po("encode", method = "treatment", affect_columns = selector_type("factor"), id = "bin")

# 压成 Learner 并基准比较
glrn_impact = as_learner(factor_pipeline %>>% lrn("regr.xgboost", nrounds = 100))
glrn_onehot = as_learner(po("encode") %>>% lrn("regr.xgboost", nrounds = 100))

# 缺失值：missing-indicator + 历史填补，再合并
impute_hist = list(
  po("missind", type = "integer", affect_columns = selector_type("integer")),
  po("imputehist", affect_columns = selector_type("integer"))
) %>>% po("featureunion") %>>%
  po("imputeoor", affect_columns = selector_type("factor"))

# 一行搞定常见脏数据的「稳健化」预置图
robust = as_learner(ppl("robustify") %>>% lrn("classif.ranger"))
```
**踩坑**：直接 `lrn("regr.xgboost")$train(tsk_ames)` 会报 `unsupported feature types: factor`——必须先编码。`ppl("robustify")` 是省心起点。

**B（回到原则）**
预处理是 Graph 的一部分；用 `selector_*` 精确指定「哪些列」，用 `ppl("robustify")` 兜底，才能稳健地上线。

> 📖 在线深入：https://zhangkaicr.github.io/mlr3book-cn/chapters/ch09-preprocessing.html

---

## C07 — 模型解释：DALEX / surrogates（黑箱可解释）

**R（原则）**
训练好的 mlr3 Learner 可被 **DALEX / DALEXtra** 包成解释器，用 `predict_parts`（SHAP-like 分解）、`predict_profile`（PD/ICE）、**全局代理树**、**局部代理（LIME）**等手段解释预测，且不依赖具体算法。

**I（输入）**
- 已训练（或待解释）的 `Learner`（建议 `predict_type = "prob"` 以拿概率）。
- 背景数据 `credit_x` 与真实标签 `credit_y`。

**A1（适用场景）**
- 向非技术方解释「为什么模型把这人判为坏客户」。
- 比较特征重要性、单特征效应、个体预测归因。

**A2（不适用 / 区分）**
- 想做变量重要性/SHAP 的因果森林场景 → 见 `causal-forest-skill`（kernelshap/hstats）。
- 仅看学习器自带 `importance()` → C05 已覆盖，但 DALEX 更通用。

**E（执行步骤 + 真实代码）**
```r
library(mlr3verse); library(DALEX); library(DALEXtra)
# 训练一个 GBM（概率输出便于解释）
lrn_gbm = lrn("classif.gbm", predict_type = "prob")
lrn_gbm$train(tsk("german_credit"))

# 包成 DALEX 解释器
gbm_exp = DALEXtra::explain_mlr3(
  lrn_gbm, data = credit_x,
  y = as.numeric(credit_y$credit_risk == "bad"),
  label = "GBM Credit", colorize = FALSE
)
# 个体归因（SHAP 式分解）
Charlie = tsk("german_credit")$data(rows = 127L, cols = tsk(...)$feature_names)
predict_parts(gbm_exp, new_observation = Charlie) %>% plot()
# 单特征效应（PD/ICE）
predict_profile(gbm_exp, variables = c("amount", "age")) %>% plot()

# 全局代理树 / 局部代理（LIME）
tree_surrogate = predict_surrogate(gbm_exp, type = "tree")
local_surrogate = predict_surrogate(gbm_exp, new_observation = Charlie, type = "lm")
```
**符号提示**：二分类常把「坏」编码为 1，解释时务必对照 `positive` 类与业务方向。

**B（回到原则）**
解释工具应与算法解耦——DALEX 把任何 mlr3 Learner 统一成解释器，使「可解释性」成为建模后的标准动作而非特例。

> 📖 在线深入：https://zhangkaicr.github.io/mlr3book-cn/chapters/ch12-model-interpretation.html

---

## C08 — 超越分类回归：生存 / 代价敏感 / 公平

**R（原则）**
mlr3 通过扩展包把同一套接口延伸到**生存分析、代价敏感分类、算法公平**——换任务类型（`as_task_surv`）、换指标（`msr("classif.costs")` / `msr("fairness.eod")`）、加公平性 PipeOp 即可，无需重写流程。

**I（输入）**
- 生存数据（时间 + 事件）、带误判代价的混淆矩阵、含受保护属性（如 `sex`）的分类任务。

**A1（适用场景）**
- 预后/失效时间建模（`surv.coxph` / `surv.svm`）。
- 不同误判代价不同（如漏诊 >> 误诊）→ `classif.costs` + 阈值调优。
- 需审计/缓解群体偏差 → `mlr3fairness` 的度量与预处理/后处理 PipeOp。

**A2（不适用 / 区分）**
- 普通分类/回归 → C01/C02。
- 异质性处理效应/因果森林 → `causal-forest-skill`。

**E（执行步骤 + 真实代码）**
```r
# 生存分析
library(mlr3proba); library(survival)
tsk_rats = as_task_surv(survival::rats, time = "time", event = "status", type = "right")
pred = lrn("surv.coxph")$train(tsk_rats, split$train)$predict(tsk_rats, split$test)

# 代价敏感：自定义误判代价 + 阈值调优
costs = matrix(c(0, 1, 5, 0), nrow = 2)          # 漏判坏客户代价更高
msr_costs = msr("classif.costs", costs = costs)
graph = po("learner_cv", lrn("classif.log_reg", predict_type = "prob")) %>>%
        po("tunethreshold", measure = msr_costs)
benchmark(benchmark_grid(tsk("german_credit"), list(as_learner(graph), lrn("classif.log_reg")), rsmp("cv", folds = 3)))

# 算法公平（mlr3fairness）
library(mlr3fairness)
task = tsk("adult_train")$set_col_roles("sex", "pta")   # 标记受保护属性
l_eod = as_learner(po("learner_cv", lrn("classif.rpart")) %>>% po("EOd"))
bmr = benchmark(benchmark_grid(task, list(lrn("classif.rpart"), l_eod), rsmp("cv", folds = 5)))
bmr$aggregate(msrs(c("classif.acc", "fairness.eod")))
```

**B（回到原则）**
mlr3 的「Task/Learner/Measure 三分立」让任务类型与公平性/代价等关注点成为「换组件」而非「重写」，是研究型建模的强大杠杆。

> 📖 在线深入：https://zhangkaicr.github.io/mlr3book-cn/chapters/ch13-beyond-regression-classification.html

---

## 速查：常用糖函数

| 目的 | 函数 |
|---|---|
| 取任务 | `tsk("penguins")` / `tsks(c(...))` |
| 取学习器 | `lrn("classif.rpart")` / `lrns(c(...))` |
| 划分/重采样 | `partition()` / `rsmp("cv", folds=10)` |
| 指标 | `msr("classif.acc")` / `msrs(c(...))` |
| 评估 | `resample()` / `benchmark_grid()` / `benchmark()` |
| 调优 | `to_tune()` / `ti()` / `tnr()` / `trm()` / `tune()` / `auto_tuner()` |
| 管道 | `po()` / `%>>%` / `gunion()` / `ppl()` / `as_learner()` |
| 选择 | `flt()` / `fs()` / `fselect()` / `auto_fselector()` |
| 选择器 | `selector_type()` / `selector_grep()` / `selector_cardinality_greater_than()` |
| 解释 | `DALEXtra::explain_mlr3()` / `predict_parts()` / `predict_profile()` |
