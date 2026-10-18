# mlr3 实战精华：从一行 `lrn()` 到可复用的机器学习流水线

> 本文是《Applied Machine Learning Using mlr3 in R》中文翻译版（mlr3book-cn）的蒸馏长文，对应技能 [`mlr3book-skill`](./SKILL.md)。
> 在线全书：https://zhangkaicr.github.io/mlr3book-cn/

---

## 为什么是 mlr3，而不是 `caret` / 直接 `train()`

mlr3 的野心是把「做机器学习实验」这件容易写成一坨脚本的事，拆成**几个不可变、可组合的对象**。核心就六个：

- **Task**（`tsk()`）—— 数据 + 目标 + 角色，与算法彻底解耦；
- **Learner**（`lrn()`）—— 统一接口的学习器，`$train()` / `$predict()`；
- **Resampling**（`rsmp()`）—— 怎么切训练/测试；
- **Measure**（`msr()`）—— 用什么指标打分；
- **Graph / PipeOp**（`po()` / `%>>%`）—— 把预处理与建模串成图；
- **Tuner / Terminator**（`tnr()` / `trm()`）—— 超参搜索与停止。

一句口诀：**先 Task，再 Learner，加 Resampling 做评估，用 Graph 做流水，用 tune 做优化。**

---

## 1. 最小闭环：建模

```r
library(mlr3)
task = tsk("penguins"); split = partition(task)
learner = lrn("classif.rpart")
learner$train(task, row_ids = split$train)
learner$predict(task, row_ids = split$test)$score(msr("classif.acc"))
```

换算法只改 `lrn("regr.rpart")` 一行——这就是解耦的力量。

## 2. 评估：别只报一个数字

单次预测有随机性。用 `resample()` 多折估计性能与不确定性，用 `benchmark_grid()` 把多个学习器 × 多个任务塞进同一个网格公平比较：

```r
rr = resample(tsk("penguins"), lrn("classif.rpart"), rsmp("cv", folds = 10))
bmr = benchmark(benchmark_grid(tsks(c("sonar","penguins")),
  lrns(c("classif.featureless","classif.rpart")), rsmp("cv", folds = 3)))
bmr$aggregate(msr("classif.acc"))
```

**永远保留一个 `classif.featureless` 基线**——任何模型弱于「无特征盲猜」都说明流程有 bug。

## 3. 调优：把参数交给搜索

```r
learner = lrn("classif.svm", kernel = "radial",
  cost = to_tune(1e-1, 1e5), gamma = to_tune(1e-1, 1))
instance = ti(tsk("sonar"), learner, rsmp("cv", folds=3),
  msr("classif.ce"), trm("evals", n_evals = 20))
tnr("random_search", batch_size = 12)$optimize(instance)
```

需要「调好参的模型」无缝进基准？`auto_tuner()` 把整段调优压扁成一个 Learner。

## 4–6. 流水线与预处理：在数据泄露之前

凡是预处理（标准化、PCA、编码、填补）都必须进 **Graph**，否则会在重采样里泄露。组合算子：`%>>%` 串联、`gunion()` 并联、`ppl()` 调预置图、`as_learner()` 压成 Learner：

```r
glrn = as_learner(po("scale") %>>% po("pca") %>>% lrn("classif.rpart"))
```

真实数据最痛的两点——**因子不支持**（`xgboost` 直接报错 `unsupported feature types: factor`）与**缺失值**——用 `ppl("robustify")` 兜底，或手写 `encodeimpact` / `imputehist` 配方。特征选择则分过滤法（`flt`）与包装法（`fselect` / `auto_fselector`）。

## 7. 解释：与算法解耦

训练完的任意 Learner 都能被 **DALEX / DALEXtra** 包成解释器，做 SHAP 式归因、PD/ICE、全局/局部代理树——不依赖具体算法：

```r
gbm_exp = DALEXtra::explain_mlr3(lrn_gbm, data = credit_x, y = ..., label = "GBM")
predict_parts(gbm_exp, new_observation = Charlie) %>% plot()
```

## 8. 超越分类回归

同一套接口延伸到**生存分析**（`as_task_surv` + `surv.coxph`）、**代价敏感分类**（`msr("classif.costs")` + 阈值调优）、**算法公平**（`mlr3fairness` 的 `fairness.eod` 度量与 `EOd` 后处理 PipeOp）。换任务类型、换指标、加一个公平性算子，流程不必重写。

---

## 给研究者的话

mlr3 真正的价值不在「跑得快」，而在**实验可复现、组件可替换、比较可公平**。当你需要把「换学习器 / 换预处理 / 换重采样」同时作为变量去扫，mlr3 比手写循环稳得多。本技能把这套心智模型拆成了 8 张可直接调用的能力卡（C01–C08），每张都附在线章节链接，装到任何机器都能跳原文。
