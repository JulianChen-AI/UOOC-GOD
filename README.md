<p align="center"><img src="assets/cover.svg" alt="UOOC-GOD：AI 自动答题，三门并行，可视化控制台" width="100%"></p>

# UOOC-GOD · 优课之神

**UOOC 刷课，到此为止。**

深大人自己的 UOOC 刷课神器。按课程名勾选，三门同时开跑，AI 自动答题。把刷课交给它，把时间留给自己。

适用于深圳大学及其他使用 UOOC 的用户。

基于 Node.js 与原生 HTML/CSS/JavaScript，调用 [YusongXiao/fuckuooc](https://github.com/YusongXiao/fuckuooc) 的 Playwright 自动化引擎。

## 可以做什么

- **按名称选课**：读取账号已有课程，多选要运行的课程。
- **控制并行数量**：同时运行 1、2 或 3 门，其他选中课程排队。
- **配置模型**：填写兼容接口地址、模型名和 API Key，设置仅对本次任务生效。
- **启动与停止**：从控制台启动任务，停止时关闭自动化浏览器。
- **查看日志**：显示登录、课程处理和错误信息。

考试阶段的课程会显示在列表中，当前界面不支持勾选启动。

## 界面与运行方式

控制台在本机打开，默认地址为 `http://127.0.0.1:4319`。点击「读取我的课程」，程序会打开 Chrome 并读取课程列表；勾选课程、设置并行数量，再点击「开始学习」。

账号从原版引擎的 `config.txt` 读取。网页里留空 API Key 时沿用引擎配置，填写后仅用于本次运行。模型应支持原版引擎使用的图片输入。

## 准备环境

需要 Node.js 24、Google Chrome，以及单独安装并配置好的原版引擎。

```sh
git clone https://github.com/YusongXiao/fuckuooc.git
cd fuckuooc
git checkout ec472a0cd767411c00950f448ec6d266dc49d67c
npm ci
```

按原版说明填写 `config.txt` 中的账号、密码和模型接口。回到控制台目录后运行：

```sh
UOOC_ENGINE=/absolute/path/to/fuckuooc node server.cjs
```

也可将引擎绝对路径写入控制台目录下的 `engine-path.txt`。macOS 用户可双击 `launch.command`；通过 `UOOC_NODE` 指定 Node 路径。

原版引擎固定为上述已适配版本；运行适配器依赖该版本的结构。下载本项目后，在含 `server.cjs` 的目录执行启动命令。

## 停止与继续

点击「停止」会结束本次任务并关闭浏览器。再次启动时读取原版引擎保存的观看记录，未完成的视频可能重播。

关闭控制台网页不会停止后台任务。此版本尚未提供保持当前视频位置的暂停功能。

## 技术结构

```text
本地网页
   │ 配置、课程选择、启停、日志
Node.js 本地服务
   │ 子进程
运行适配器
   │ 登录、课程筛选、并行任务
fuckuooc 引擎 → Playwright → Chrome
```

前端使用原生 HTML/CSS/JavaScript；服务端使用 Node.js 内置 HTTP 模块。课程学习与答题能力来自原版引擎，控制台负责操作入口与运行管理。账号、密钥和学习记录保留在本地。

## 当前状态

轻量原型，已接入课程读取、选择、任务启停和日志。课程名称读取经过真实账号验证；长期运行与不同账号、课程页面的兼容性仍需继续验证。

AI 答题的准确性与任务完成结果需要自行核对；运行可能产生模型接口费用。请只处理自己有权访问的课程，并遵守学校与平台规则。

## 致谢与许可

自动化引擎来自 [YusongXiao/fuckuooc](https://github.com/YusongXiao/fuckuooc)，遵循其 MIT 许可。

控制台采用 [MIT 许可](LICENSE)。原版引擎的来源与许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
