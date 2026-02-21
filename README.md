# 中南财经政法大学新闻获取小程序 ——章鱼的高效助手

## 项目概述

章鱼的高效助手是一款面向中南财经政法大学师生的微信小程序，旨在帮助用户快速获取校园新闻资讯。小程序支持从多个校园网站自动提取新闻，提供优雅的阅读体验，并支持收藏、搜索等功能。

## 功能特性

### 核心功能

| 功能模块 | 描述 |
|---------|------|
| 📰 多源新闻获取 | 支持文澜新闻、本科生院、校团委三个校园网站 |
| 🔍 智能搜索 | 支持按标题关键词搜索新闻 |
| ⏰ 日期过滤 | 支持近7天/不限两种时间筛选模式 |
| ⭐ 收藏管理 | 支持收藏喜欢的新闻，方便后续查看 |
| ✅ 已读标记 | 自动记录已读新闻，区分未读内容 |
| 📖 正文提取 | 自动提取新闻正文，优化阅读体验 |
| 🔗 原文链接 | 支持复制原文链接，在浏览器中打开 |
| 📤 分享功能 | 支持分享给微信好友和朋友圈 |

### 界面预览

```
┌─────────────────────────────────────┐
│        章鱼的高效助手                │
│      校园资讯，一手掌握              │
├─────────────────────────────────────┤
│  📰 新闻来源          🕐 14:30 更新  │
│  ┌─────────┬─────────┬─────────┐    │
│  │  📰     │  🎓     │  📢     │    │
│  │ 文澜新闻 │ 本科生院 │  校团委  │    │
│  └─────────┴─────────┴─────────┘    │
│  ┌─────────┐                        │
│  │   ⭐    │                        │
│  │ 我的收藏 │                        │
│  └─────────┘                        │
├─────────────────────────────────────┤
│  ⏰ 近7天  🔍 搜索标题...            │
├─────────────────────────────────────┤
│  📋 25 条新闻        ➖ ➕           │
│  ┌───────────────────────────────┐  │
│  │ 关于2024年春季学期开学通知     │  │
│  │ 本科生院  2024-02-20  ✅已读   │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 校园文化节活动报名开始         │  │
│  │ 文澜新闻  2024-02-19          │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 技术架构

### 前端技术栈

- **框架**: 微信小程序原生开发
- **组件框架**: glass-easel
- **样式**: WXSS + CSS3 动画
- **数据存储**: 微信本地存储 (wx.setStorageSync)

### 项目结构

```
zhangyugaoxiaozhuli/
├── pages/
│   ├── index/                 # 首页
│   │   ├── index.js           # 页面逻辑：新闻获取、过滤、收藏
│   │   ├── index.wxml         # 页面结构
│   │   ├── index.wxss         # 页面样式
│   │   └── index.json         # 页面配置
│   ├── news-detail/           # 新闻详情页
│   │   ├── news-detail.js     # 正文提取、收藏、分享
│   │   ├── news-detail.wxml
│   │   ├── news-detail.wxss
│   │   └── news-detail.json
│   └── web-view/              # 网页浏览页（备用）
│       ├── web-view.js
│       ├── web-view.wxml
│       ├── web-view.wxss
│       └── web-view.json
├── app.js                     # 小程序入口
├── app.json                   # 全局配置
├── app.wxss                   # 全局样式
├── project.config.json        # 项目配置
└── sitemap.json               # 站点地图
```

### 核心模块设计

#### 1. 新闻提取模块

针对不同网站采用定制化的 HTML 解析策略：

```javascript
// 网站配置
websites: [
  { id: 1, name: '文澜新闻', url: '...', type: 'wellan' },
  { id: 2, name: '本科生院', url: '...', type: 'jwc' },
  { id: 3, name: '校团委', url: '...', type: 'tw' }
]

// 提取策略分发
switch (website.type) {
  case 'jwc':    newsList = this.extractJWCNews(html);  break;
  case 'tw':     newsList = this.extractTWNews(html);   break;
  case 'wellan': newsList = this.extractWellanNews(html); break;
}
```

#### 2. 正文提取模块

支持多种正文容器的智能识别：

```javascript
// 正文容器匹配优先级
const contentPatterns = [
  /<div[^>]*class=["'][^"']*wp_articlecontent[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  /<div[^>]*class=["'][^"']*v_news_content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  /<article[^>]*>([\s\S]*?)<\/article>/i,
];
```

#### 3. 数据存储模块

使用微信本地存储实现数据持久化：

```javascript
// 存储键名
'readNewsMap'      // 已读新闻记录
'favoriteNewsMap'  // 收藏标记
'favoriteNewsData' // 收藏详情
'daysFilterIndex'  // 日期过滤设置
'listFontSize'     // 字体大小设置
'lastUpdateTime'   // 最后更新时间
```

---

## AI 辅助开发历程

本项目通过 AI（Trae IDE）辅助完成开发，以下是完整的开发过程记录。

### 一、产品界面设计

#### 设计理念

1. **简洁至上**: 减少不必要的元素，突出核心功能
2. **视觉层次**: 通过颜色、大小、间距建立清晰的信息层级
3. **交互反馈**: 每个操作都有即时的视觉反馈
4. **一致性**: 统一的配色方案和组件风格

#### 配色方案

```css
/* 主色调 - 渐变紫蓝 */
--primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* 背景色 */
--bg-light: #f5f7fa;
--bg-card: #ffffff;

/* 文字色 */
--text-primary: #2c3e50;
--text-secondary: #95a5a6;

/* 功能色 */
--color-success: #07c160;
--color-warning: #f59e0b;
--color-error: #ef4444;
```

#### 动画设计

```css
/* 页面入场动画 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20rpx); }
  to { opacity: 1; transform: translateY(0); }
}

/* 列表项依次入场 */
.news-item:nth-child(1) { animation-delay: 0.05s; }
.news-item:nth-child(2) { animation-delay: 0.10s; }
/* ... */

/* 加载旋转动画 */
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### 二、功能设计

#### 功能演进过程

| 版本 | 新增功能 | 设计考量 |
|------|---------|---------|
| v1.0 | 基础新闻列表 | 实现核心的新闻获取和展示 |
| v1.1 | 多新闻源支持 | 扩展数据来源，增加用户选择 |
| v1.2 | 搜索和过滤 | 提升信息检索效率 |
| v1.3 | 收藏和已读 | 增强用户粘性，记录阅读状态 |
| v1.4 | 正文提取 | 优化阅读体验，无需跳转网页 |
| v1.5 | 字体调整 | 适应用户个性化需求 |
| v1.6 | 代码重构 | 清理冗余代码，提升维护性 |

#### 交互设计要点

1. **网站选择器**: 采用卡片式设计，选中状态有明显的视觉区分
2. **新闻列表**: 紧凑模式展示更多信息，支持字体大小调整
3. **加载状态**: 遮罩层 + 旋转动画，防止用户误操作
4. **错误处理**: 友好的错误提示 + 重试按钮

### 三、代码实现

#### 关键技术点

##### 1. HTML 解析策略

由于微信小程序不支持 DOM 解析，采用正则表达式提取：

```javascript
// 多模式提取确保成功率
extractJWCNews(html, baseUrl) {
  let newsList = [];
  
  // 方法1: 结构化匹配
  const columnPattern = /<li[^>]*>(.*?)<\/li>/g;
  // ...解析逻辑
  
  // 方法2: 备用方案（当方法1结果不足时）
  if (newsList.length < 3) {
    const backupPattern = /<a[^>]+href=["']?([^"'>]+)["']?.../g;
    // ...解析逻辑
  }
  
  return newsList;
}
```

##### 2. 日期格式处理

不同网站的日期格式各异，需要统一处理：

```javascript
// 支持的日期格式
// - 2024-02-20 (ISO格式)
// - 2024.02.20 (点分隔)
// - 2024年02月20日 (中文格式)

parseDate(dateStr) {
  if (dateStr.includes('年') && dateStr.includes('月')) {
    dateStr = dateStr.replace('年', '-').replace('月', '-').replace('日', '');
  }
  return new Date(dateStr);
}
```

##### 3. 正文清洗

提取正文后需要进行多层清洗：

```javascript
// 清洗流程
contentHtml = this.extractContentFromHTML(html);  // 提取正文区域
contentHtml = this.processHTMLEntities(contentHtml);  // 处理HTML实体
const text = this.extractTextFromHtml(contentHtml);  // 提取纯文本
const cleaned = this.normalizeParagraphText(text);  // 规范化段落
const final = this.cleanFooterContent(cleaned);  // 清理页脚信息
```

### 四、开发过程中的问题与解决方案

#### 问题1: HTML 解析不稳定

**现象**: 不同网站的 HTML 结构差异大，单一解析模式无法覆盖所有情况

**解决方案**:
- 为每个网站设计专门的提取函数
- 采用多模式匹配，主方法失败时启用备用方案
- 添加有效性验证，过滤无效链接和标题

```javascript
// 验证新闻链接有效性
isValidNewsLink(href, title) {
  // 过滤无效前缀
  const invalidPrefixes = ['javascript:', '#', 'mailto:'];
  // 过滤导航关键词
  const navigation_keywords = ['首页', '网站地图', '联系我们'];
  // 标题长度检查
  if (title.trim().length < 5) return false;
  return true;
}
```

#### 问题2: 网络请求限制

**现象**: 校园网站可能对请求有限制，导致获取失败

**解决方案**:
- 添加请求超时设置 (15秒)
- 实现重试机制 (最多2次)
- 友好的错误提示，引导用户复制链接到浏览器

```javascript
// 重试机制
if (retryCount < 2) {
  setTimeout(() => {
    this.fetchNews(website, retryCount + 1);
  }, 1000);
  return;
}
```

#### 问题3: 文澜新闻误抓正文摘要

**现象**: 文澜新闻列表页包含正文摘要，容易被误抓为标题

**解决方案**:
- 优先匹配带 `title` 属性的链接
- 添加标题有效性验证，排除摘要文本特征

```javascript
isValidWellanTitle(title) {
  // 排除摘要开头
  if (/^(新闻网讯|通讯员|记者|报道)/.test(title)) return false;
  // 排除正文段落特征
  const punctuationCount = (title.match(/[，。；：、]/g) || []).length;
  if (punctuationCount >= 3 && title.length > 35) return false;
  return true;
}
```

#### 问题4: 正文包含无关内容

**现象**: 提取的正文包含页脚、版权信息等无关内容

**解决方案**:
- 定义页脚关键词列表
- 从文末向前扫描，发现关键词后截断

```javascript
const footerKeywords = ['版权所有', '备案号', '公安备案', 'ICP备', '技术支持'];
const contactKeywords = ['地址：', '邮编：', '电话：'];
```

#### 问题5: 代码冗余积累

**现象**: 开发过程中遗留了未使用的代码

**解决方案**:
- 定期进行代码审查
- 使用搜索工具检查函数调用情况
- 清理未使用的属性、方法和样式

**已清理的冗余代码**:
- `checkAutoRefresh()` - 被 `silentRefreshAll()` 替代
- `autoRefreshAll()` - 旧版本的刷新逻辑
- `filterNewsByDays()` - 功能已整合到 `applyFilters()`
- `normalizeNumberSpacing()` - 从未被调用
- `viewMode` 属性及相关样式 - 功能未实现

### 五、AI 辅助开发经验总结

#### 有效的协作模式

1. **明确需求描述**: 清晰说明功能目标和预期效果
2. **渐进式开发**: 先实现核心功能，再逐步优化
3. **及时反馈问题**: 发现问题立即反馈，避免问题积累
4. **代码审查**: 定期检查代码质量，清理冗余

#### AI 擅长的任务

- 代码框架搭建和结构设计
- 正则表达式编写
- 错误处理逻辑
- 样式优化和动画实现
- 代码重构和冗余清理

#### 需要人工把控的部分

- 业务逻辑的最终确认
- 用户体验的细节调整
- 网站结构的实地验证
- 功能测试和边界情况

---

## 使用说明

### 环境要求

- 微信开发者工具 (最新版本)
- 微信小程序账号

### 运行步骤

1. 在微信开发者工具中导入项目
2. 填写小程序 AppID
3. 点击"编译"运行小程序

### 功能操作

#### 浏览新闻
1. 打开小程序，首页自动加载所有新闻源的最新新闻
2. 点击网站卡片切换新闻来源
3. 使用搜索框搜索特定新闻
4. 点击"近7天/不限"切换时间过滤

#### 阅读详情
1. 点击新闻条目进入详情页
2. 系统自动提取正文内容
3. 使用 ➕/➖ 调整字体大小
4. 点击 ⭐ 收藏新闻

#### 管理收藏
1. 点击"我的收藏"卡片
2. 查看已收藏的新闻列表
3. 点击 ⭐ 取消收藏

---

## 后续维护指南

### 添加新的新闻源

1. 在 `index.js` 的 `websites` 数组中添加配置：

```javascript
{
  id: 5,
  name: '新网站名称',
  url: 'https://example.com/news/list.htm',
  type: 'newsite'  // 唯一标识
}
```

2. 实现对应的提取函数：

```javascript
extractNewSiteNews(html, baseUrl) {
  // 分析目标网站的HTML结构
  // 编写正则表达式提取新闻
  // 返回新闻列表
}
```

3. 在 `fetchNews` 和 `fetchNewsSilent` 中添加分支：

```javascript
case 'newsite':
  newsList = this.extractNewSiteNews(html, website.url);
  break;
```

### 修改正文提取规则

当网站改版导致正文提取失败时：

1. 打开浏览器开发者工具，分析新的正文容器
2. 在 `news-detail.js` 的 `extractXXXContentHtml` 函数中更新正则表达式
3. 测试验证提取效果

### 常见问题排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 新闻列表为空 | 网站结构变化 | 更新提取正则表达式 |
| 正文提取失败 | 容器类名变化 | 更新 contentPatterns |
| 请求超时 | 网络问题 | 检查网络连接，增加超时时间 |
| 图片不显示 | 跨域限制 | 使用 web-view 打开原文 |

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0 | 2024-02 | 初始版本，基础新闻获取功能 |
| v1.5 | 2024-02 | 添加收藏、搜索、正文提取等功能 |
| v1.6 | 2024-02 | 代码重构，清理冗余代码 |

---

## 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进本项目。

## 许可证

MIT License
