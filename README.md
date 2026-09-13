# 山河足迹 · 我的城市地图

在中国地图上点亮去过的城市，为每一座城写下到访日期与旅行感想。

**在线访问：<https://zhimeng233.github.io/city-footprint-map/>**

## 功能特性

- **省市两级地图** — 省级视图总览全国，点击进入省份后切换到城市视图，支持地级市、自治州、地区及盟；直辖市与港澳台按整体区域点亮。
- **点亮与统计** — 点击地图区域或左侧列表即可点亮／取消城市，实时显示已点亮城市数量与省内进度。
- **城市手记** — 为每座点亮的城市记录到访日期与旅行感想（最多 2000 字），编辑后自动保存。
- **城市搜索** — 支持按名称快速检索全国城市并直接定位点亮。
- **高清全图导出** — 一键生成全国足迹地图 PNG 图片。
- **深浅色主题** — 内置浅色／深色两套配色，切换后自动记住偏好。
- **秦岭—淮河线示意** — 可开关的南北分界参考线（示意用途，沿线存在过渡带）。
- **地图交互** — 滚轮缩放（0.7×–20×）、拖动浏览、城市名称标签显隐、视角重置。

## 技术实现

纯静态站点，**无需构建步骤**，可直接由任意静态服务器托管。

| 组成 | 说明 |
| --- | --- |
| 渲染引擎 | [Apache ECharts](https://echarts.apache.org/)（本地内置 `echarts.min.js`，无 CDN 依赖） |
| 前端代码 | 原生 HTML / CSS / JavaScript，零第三方框架与打包工具 |
| 地理数据 | `data/` 目录下的 GeoJSON，来源为[阿里云 DataV.GeoAtlas](https://datav.aliyun.com/portal/school/atlas/area_selector) |
| 数据存储 | 浏览器 `localStorage`（键名 `atlas-footprints-v1`），足迹、手记与偏好设置全部保存在本地 |

> 所有记录仅保存在当前浏览器中，不会上传到任何服务器；清理网站数据会同时删除这些记录。

## 项目结构

```
.
├── index.html        页面结构
├── style.css         样式与深浅色主题变量
├── app.js            地图渲染、点亮逻辑、手记与导出
├── echarts.min.js    ECharts 库（本地引入）
├── favicon.svg       站点图标
└── data/             全国及各省份 GeoJSON 边界数据
    ├── china.json
    ├── 130000.json
    └── ...
```

## 本地运行

页面通过 `fetch` 加载 `data/` 中的 GeoJSON，受浏览器同源策略限制，**不能直接双击打开 `index.html`**，需要启动一个本地 HTTP 服务：

```bash
# Python
python -m http.server 8000

# 或 Node.js
npx serve .
```

随后访问 <http://localhost:8000>。

## 部署

仓库已启用 GitHub Pages，以 `main` 分支根目录作为发布源。推送到 `main` 分支后会自动重新发布：

```bash
git add .
git commit -m "更新内容"
git push origin main
```

## 边界数据说明

本项目地图为示意地图，边界数据来自阿里云 DataV.GeoAtlas，仅用于个人足迹记录与可视化展示，不作为领土边界的法定依据。
