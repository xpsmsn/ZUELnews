// index.js
Page({
  data: {
    websites: [
      {
        id: 1,
        name: '文澜新闻',
        url: 'https://wellan.zuel.edu.cn/1669/list.htm',
        type: 'wellan'
      },
      {
        id: 2,
        name: '本科生院',
        url: 'https://jwc.zuel.edu.cn/5768/list.htm',
        type: 'jwc'
      },
      {
        id: 3,
        name: '校团委',
        url: 'https://tw.zuel.edu.cn/4353/list.htm',
        type: 'tw'
      },
      {
        id: 4,
        name: '我的收藏',
        url: '',
        type: 'favorites'
      }
    ],
    newsList: [],
    displayNewsList: [],
    loading: false,
    errorMessage: '',
    selectedWebsite: null,
    searchQuery: '',
    daysFilterOptions: ['近7天', '不限'],
    daysFilterIndex: 0,
    daysFilter: 7,
    readMap: {},
    favoriteMap: {},
    hideHeader: false,
    showFavorites: false,
    favoriteList: [],
    listFontSize: 28,
    lastUpdateTime: '',
    isRefreshing: false
  },
  
  onLoad() {
    this.loadStoredState();
    this.silentRefreshAll();
  },

  onShow() {
  },

  loadStoredState() {
    const readMap = wx.getStorageSync('readNewsMap') || {};
    const favoriteMap = wx.getStorageSync('favoriteNewsMap') || {};
    const daysFilterIndex = wx.getStorageSync('daysFilterIndex') || 0;
    const daysFilter = daysFilterIndex === 0 ? 7 : 0;
    const listFontSize = wx.getStorageSync('listFontSize') || 28;
    const lastUpdateTime = wx.getStorageSync('lastUpdateTime') || '';

    this.setData({
      readMap,
      favoriteMap,
      daysFilterIndex,
      daysFilter,
      listFontSize,
      lastUpdateTime
    });
  },

  silentRefreshAll() {
    if (this.data.isRefreshing) return;
    
    this.setData({ isRefreshing: true });

    const newsSources = this.data.websites.filter(w => w.type !== 'favorites');
    let allNews = [];
    let completedCount = 0;
    const totalCount = newsSources.length;

    newsSources.forEach(website => {
      this.fetchNewsSilent(website, (newsList) => {
        allNews = allNews.concat(newsList);
        completedCount++;

        if (completedCount === totalCount) {
          this.processSilentNews(allNews);
        }
      });
    });
  },

  processSilentNews(allNews) {
    const dedupedNews = this.dedupeNewsList(allNews);
    const sortedNews = dedupedNews.sort((a, b) => new Date(b.dateObj) - new Date(a.dateObj));
    const baseNews = sortedNews.slice(0, 50);
    
    const now = new Date();
    const updateTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    this.setData({
      isRefreshing: false,
      lastUpdateTime: updateTime
    });

    if (!this.data.selectedWebsite) {
      this.setData({ newsList: baseNews }, () => {
        this.applyFilters();
      });
    }

    wx.setStorageSync('lastUpdateTime', updateTime);
    wx.setStorageSync('lastRefreshTimestamp', Date.now());
  },

  fetchNewsSilent(website, callback) {
    wx.request({
      url: website.url,
      method: 'GET',
      timeout: 15000,
      success: (res) => {
        if (res.statusCode !== 200) {
          callback([]);
          return;
        }
        
        const html = res.data;
        let newsList = [];
        
        switch (website.type) {
          case 'jwc':
            newsList = this.extractJWCNews(html, website.url);
            break;
          case 'tw':
            newsList = this.extractTWNews(html, website.url);
            break;
          case 'wellan':
            newsList = this.extractWellanNews(html, website.url);
            break;
        }
        
        callback(newsList);
      },
      fail: () => {
        callback([]);
      }
    });
  },

  processAllNews(allNews) {
    const dedupedNews = this.dedupeNewsList(allNews);
    const sortedNews = dedupedNews.sort((a, b) => new Date(b.dateObj) - new Date(a.dateObj));
    const baseNews = sortedNews.slice(0, 50);
    
    const now = new Date();
    const updateTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    this.setData({
      newsList: baseNews,
      loading: false,
      isRefreshing: false,
      lastUpdateTime: updateTime,
      selectedWebsite: null
    }, () => {
      this.applyFilters();
    });

    wx.setStorageSync('lastUpdateTime', updateTime);
    wx.setStorageSync('lastRefreshTimestamp', Date.now());
  },

  saveFavoriteMap(favoriteMap) {
    wx.setStorageSync('favoriteNewsMap', favoriteMap);
  },

  saveReadMap(readMap) {
    wx.setStorageSync('readNewsMap', readMap);
  },

  buildNewsKey(news) {
    const titleKey = (news.title || '').trim().replace(/\s+/g, '');
    const urlKey = (news.url || '').trim();
    return `${urlKey}|${titleKey}`;
  },

  applyFilters() {
    const { newsList, searchQuery, daysFilter, readMap, favoriteMap } = this.data;
    const normalizedQuery = (searchQuery || '').trim().toLowerCase();

    let result = newsList.map(item => {
      const dateObj = item.dateObj || this.parseDate(item.date);
      return {
        ...item,
        dateObj,
        isRead: !!readMap[this.buildNewsKey(item)],
        isFavorite: !!favoriteMap[this.buildNewsKey(item)]
      };
    });

    if (daysFilter > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysFilter);
      cutoffDate.setHours(0, 0, 0, 0);
      result = result.filter(item => item.dateObj instanceof Date && item.dateObj >= cutoffDate);
    }

    if (normalizedQuery) {
      result = result.filter(item => {
        const title = (item.title || '').toLowerCase();
        const source = (item.source || '').toLowerCase();
        return title.includes(normalizedQuery) || source.includes(normalizedQuery);
      });
    }

    this.setData({
      displayNewsList: result
    });
  },

  onSearchInput(e) {
    this.setData({
      searchQuery: e.detail.value
    }, () => this.applyFilters());
  },

  clearSearch() {
    this.setData({
      searchQuery: ''
    }, () => this.applyFilters());
  },

  toggleDaysFilter() {
    const daysFilterIndex = this.data.daysFilterIndex === 0 ? 1 : 0;
    const daysFilter = daysFilterIndex === 0 ? 7 : 0;
    this.setData({
      daysFilterIndex,
      daysFilter
    }, () => {
      wx.setStorageSync('daysFilterIndex', daysFilterIndex);
      this.applyFilters();
    });
  },

  increaseListFontSize() {
    const nextSize = Math.min(this.data.listFontSize + 2, 36);
    this.setData({
      listFontSize: nextSize
    });
    wx.setStorageSync('listFontSize', nextSize);
  },

  decreaseListFontSize() {
    const nextSize = Math.max(this.data.listFontSize - 2, 22);
    this.setData({
      listFontSize: nextSize
    });
    wx.setStorageSync('listFontSize', nextSize);
  },

  toggleFavorite(e) {
    const news = e.currentTarget.dataset.news;
    if (!news) return;

    const key = this.buildNewsKey(news);
    const favoriteMap = { ...this.data.favoriteMap };
    const favoriteData = wx.getStorageSync('favoriteNewsData') || {};

    if (favoriteMap[key]) {
      delete favoriteMap[key];
      delete favoriteData[key];
    } else {
      favoriteMap[key] = true;
      favoriteData[key] = {
        title: news.title,
        url: news.url,
        source: news.source,
        date: news.date
      };
    }

    this.setData({
      favoriteMap
    }, () => {
      this.saveFavoriteMap(favoriteMap);
      wx.setStorageSync('favoriteNewsData', favoriteData);
      this.applyFilters();
      if (this.data.showFavorites) {
        this.loadFavoriteList();
      }
    });
  },

  loadFavoriteList() {
    const favoriteData = wx.getStorageSync('favoriteNewsData') || {};
    const favoriteList = Object.keys(favoriteData).map(key => {
      const item = favoriteData[key];
      return {
        id: key,
        title: item.title || '',
        url: item.url || '',
        source: item.source || '未知来源',
        date: item.date || '未知日期',
        dateObj: item.date ? new Date(item.date) : new Date(),
        isFavorite: true
      };
    }).filter(item => item.title);
    
    favoriteList.sort((a, b) => new Date(b.dateObj) - new Date(a.dateObj));
    
    this.setData({
      favoriteList
    });
  },

  retryFetch() {
    if (this.data.selectedWebsite) {
      this.setData({
        loading: true,
        errorMessage: ''
      });
      this.fetchNews(this.data.selectedWebsite);
    }
  },

  // 选择网站
  selectWebsite(e) {
    const website = e.currentTarget.dataset.website;
    const currentWebsite = this.data.selectedWebsite;
    
    if (currentWebsite && currentWebsite.id === website.id) {
      return;
    }
    
    if (website.type === 'favorites') {
      this.setData({
        selectedWebsite: website,
        showFavorites: true,
        hideHeader: true,
        loading: false,
        errorMessage: ''
      });
      this.loadFavoriteList();
      return;
    }
    
    this.setData({
      selectedWebsite: website,
      showFavorites: false,
      loading: true,
      errorMessage: '',
      hideHeader: true
    });
    this.fetchNews(website);
  },
  
  // 获取新闻 - 直接HTTP请求
  fetchNews(website, retryCount = 0) {
    wx.request({
      url: website.url,
      method: 'GET',
      timeout: 15000,
      success: (res) => {
        console.log('HTTP请求成功', { statusCode: res.statusCode });
        
        // 检查响应状态
        if (res.statusCode !== 200) {
          console.error('HTTP请求失败', { statusCode: res.statusCode });
          this.setData({ loading: false });
          wx.showToast({
            title: `请求失败 (${res.statusCode})`,
            icon: 'none'
          });
          return;
        }
        
        // 解析HTML内容，提取新闻列表
        const html = res.data;
        console.log('获取到HTML内容', { length: html.length });
        
        let newsList = [];
        
        // 根据网站类型选择不同的提取策略
        switch (website.type) {
          case 'jwc':
            newsList = this.extractJWCNews(html, website.url);
            break;
          case 'tw':
            newsList = this.extractTWNews(html, website.url);
            break;
          case 'wellan':
            newsList = this.extractWellanNews(html, website.url);
            break;
          default:
            newsList = [];
            break;
        }
        
        console.log('解析到新闻数量', { count: newsList.length });
        
        const dedupedNews = this.dedupeNewsList(newsList);
        const sortedNews = dedupedNews.sort((a, b) => new Date(b.dateObj) - new Date(a.dateObj));
        const baseNews = sortedNews.slice(0, 30);
        
        const now = new Date();
        const updateTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        this.setData({
          newsList: baseNews,
          loading: false,
          errorMessage: '',
          lastUpdateTime: updateTime
        }, () => {
          this.applyFilters();
        });
        
        wx.setStorageSync('lastUpdateTime', updateTime);
        wx.setStorageSync('lastRefreshTimestamp', Date.now());
        
        if (baseNews.length === 0) {
          wx.showToast({
            title: '未提取到新闻',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取新闻失败', err);
        
        // 重试机制
        if (retryCount < 2) {
          console.log(`重试获取新闻 (${retryCount + 1}/2)`);
          setTimeout(() => {
            this.fetchNews(website, retryCount + 1);
          }, 1000);
          return;
        }
        
        // 所有重试都失败
        let errorMsg = '网络受限，可能因校内网络限制';
        if (err.errType === 'request:timeout') {
          errorMsg = '网络连接超时，可能因校内网络限制';
        } else if (err.errType === 'request:fail') {
          errorMsg = '网络连接失败，可能因校内网络限制';
        }
        
        this.setData({
          loading: false,
          errorMessage: errorMsg
        });
        
        wx.showToast({
          title: errorMsg,
          icon: 'none'
        });
      }
    });
  },
  
  // 本科生院新闻专门提取函数
  extractJWCNews(html, baseUrl) {
    const newsList = [];
    
    // 方法1: 使用column-news模式匹配
    const columnPattern = /<li[^>]*>(.*?)<\/li>/g;
    let match;
    
    while ((match = columnPattern.exec(html)) !== null) {
      const liContent = match[1];
      if (liContent.includes('column-news-title') && liContent.includes('column-news-date')) {
        const newsItem = this.parseJWCNewsItem(liContent, baseUrl);
        if (newsItem) {
          newsList.push(newsItem);
        }
      }
    }
    
    // 方法2: 如果column模式不够，尝试直接匹配链接和日期
    if (newsList.length < 3) {
      const backupPattern = /<a[^>]+href=["']?([^"'>]+)["']?[^>]*title=["']?([^"']*)["']?[^>]*>([^<]+)<\/a>.*?(\d{4}-\d{2}-\d{2})/g;
      while ((match = backupPattern.exec(html)) !== null) {
        const href = match[1];
        const title = match[3] || match[2];
        const date = match[4];
        
        if (this.isValidNewsLink(href, title)) {
          const newsItem = {
            id: Date.now() + Math.random(),
            title: title.trim(),
            url: this.buildFullUrl(href, baseUrl),
            date: date,
            dateObj: new Date(date),
            source: '本科生院'
          };
          newsList.push(newsItem);
        }
      }
    }
    
    return newsList;
  },
  
  // 解析本科生院新闻项
  parseJWCNewsItem(liContent, baseUrl) {
    // 查找链接和标题
    const linkPattern = /<a[^>]+href=["']?([^"'>]+)["']?[^>]*title=["']?([^"']*)["']?[^>]*>([^<]+)<\/a>/;
    const linkMatch = liContent.match(linkPattern);
    
    // 查找日期
    const datePattern = /<span[^>]*class=["'][^"']*column-news-date[^"']*["'][^>]*>(\d{4}-\d{2}-\d{2})<\/span>/;
    const dateMatch = liContent.match(datePattern);
    
    if (linkMatch && dateMatch) {
      const href = linkMatch[1];
      const title = linkMatch[3] || linkMatch[2];
      const date = dateMatch[1];
      
      if (this.isValidNewsLink(href, title)) {
        return {
          id: Date.now() + Math.random(),
          title: title.trim(),
          url: this.buildFullUrl(href, baseUrl),
          date: date,
          dateObj: new Date(date),
          source: '本科生院'
        };
      }
    }
    return null;
  },
  
  // 校团委新闻专门提取函数
  extractTWNews(html, baseUrl) {
    const newsList = [];
    
    // 方法1: 尝试匹配完整的li结构
    const liPattern = /<li[^>]*>(.*?)<\/li>/g;
    let match;
    
    while ((match = liPattern.exec(html)) !== null) {
      const liContent = match[1];
      const newsItem = this.parseTWNewsItem(liContent, baseUrl);
      if (newsItem) {
        newsList.push(newsItem);
      }
    }
    
    // 方法2: 如果li方法不够，尝试直接匹配链接
    if (newsList.length < 3) {
      const directPattern = /<a[^>]+href=["']?([^"'>]+)["']?[^>]*title=["']?([^"']*)["']?[^>]*>([^<]+)<\/a>/g;
      while ((match = directPattern.exec(html)) !== null) {
        const href = match[1];
        const title = match[3] || match[2];
        
        if (this.isValidNewsLink(href, title)) {
          // 尝试从URL中提取日期
          const urlDateMatch = href.match(/\/(\d{4})\/(\d{2})(\d{2})\//);
          let date = '';
          if (urlDateMatch) {
            date = `${urlDateMatch[1]}-${urlDateMatch[2]}-${urlDateMatch[3]}`;
          }
          
          const newsItem = {
            id: Date.now() + Math.random(),
            title: title.trim(),
            url: this.buildFullUrl(href, baseUrl),
            date: date || new Date().toISOString().split('T')[0],
            dateObj: date ? new Date(date) : new Date(),
            source: '校团委'
          };
          newsList.push(newsItem);
        }
      }
    }
    
    return newsList;
  },
  
  // 解析校团委新闻项
  parseTWNewsItem(liContent, baseUrl) {
    // 查找链接
    const linkPatterns = [
      /<a[^>]+href=["']?([^"'>]+)["']?[^>]*title=["']?([^"']*)["']?[^>]*>([^<]+)<\/a>/,
      /<a[^>]+href=["']?([^"'>]+)["']?[^>]*>([^<]+)<\/a>/
    ];
    
    let href = null;
    let title = null;
    
    for (const pattern of linkPatterns) {
      const linkMatch = liContent.match(pattern);
      if (linkMatch) {
        if (linkMatch.length === 4) {
          href = linkMatch[1];
          title = linkMatch[3] || linkMatch[2];
        } else if (linkMatch.length === 3) {
          href = linkMatch[1];
          title = linkMatch[2];
        }
        break;
      }
    }
    
    // 查找日期
    const datePatterns = [
      /column-news-date[^>]*>(\d{4}-\d{2}-\d{2})/,
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{4}年\d{2}月\d{2}日)/
    ];
    
    let date = '';
    for (const pattern of datePatterns) {
      const dateMatch = liContent.match(pattern);
      if (dateMatch) {
        date = dateMatch[1];
        // 转换中文日期格式为ISO格式
        if (date.includes('年') && date.includes('月')) {
          date = date.replace('年', '-').replace('月', '-').replace('日', '');
        }
        break;
      }
    }
    
    if (href && title) {
      if (this.isValidNewsLink(href, title)) {
        return {
          id: Date.now() + Math.random(),
          title: title.trim(),
          url: this.buildFullUrl(href, baseUrl),
          date: date || new Date().toISOString().split('T')[0],
          dateObj: date ? new Date(date) : new Date(),
          source: '校团委'
        };
      }
    }
    return null;
  },
  
  // 验证是否为有效的新闻链接
  isValidNewsLink(href, title) {
    if (!href || !title) {
      return false;
    }
    
    // 过滤无效链接
    const invalidPrefixes = ['javascript:', '#', 'mailto:', 'tel:'];
    if (invalidPrefixes.some(prefix => href.startsWith(prefix))) {
      return false;
    }
    
    // 过滤导航链接
    const navigation_keywords = ['首页', '网站地图', '加入收藏', '联系我们', '办事指南', '学院概况', '通知公告'];
    for (const keyword of navigation_keywords) {
      if (title.includes(keyword)) {
        return false;
      }
    }
    
    // 标题长度检查
    if (title.trim().length < 5) {
      return false;
    }
    
    return true;
  },
  
  // 构建完整URL
  buildFullUrl(href, baseUrl) {
    if (href.startsWith('http')) {
      return href;
    } else if (href.startsWith('/')) {
      const base = baseUrl.match(/^https?:\/\/[^/]+/)[0];
      return base + href;
    } else {
      return baseUrl + '/' + href;
    }
  },
  
  // 解析日期字符串为Date对象
  parseDate(dateStr) {
    if (!dateStr) {
      return new Date();
    }
    
    // 清理日期字符串
    dateStr = dateStr.trim();
    
    // 转换中文日期格式
    if (dateStr.includes('年') && dateStr.includes('月')) {
      dateStr = dateStr.replace('年', '-').replace('月', '-').replace('日', '');
    }
    
    return new Date(dateStr);
  },
  
  // 查看新闻详情
  viewNewsDetail(e) {
    const news = e.currentTarget.dataset.news;
    if (!news) return;

    const key = this.buildNewsKey(news);
    const readMap = { ...this.data.readMap, [key]: true };

    this.setData({
      readMap
    }, () => {
      this.saveReadMap(readMap);
      this.applyFilters();
    });

    wx.navigateTo({
      url: '/pages/news-detail/news-detail?news=' + encodeURIComponent(JSON.stringify(news))
    });
  },
  
  // 文澜新闻专门提取函数
  extractWellanNews(html, baseUrl) {
    const newsList = [];
    
    // 仅抓取主列表，排除“推荐阅读”等侧栏
    const recommendationKeywords = ['推荐阅读', '相关推荐', '热门阅读', '热点阅读', '相关阅读', 'recommend', 'related'];
    
    // 方法1: 尝试匹配完整的li结构
    const liPattern = /<li[^>]*>(.*?)<\/li>/g;
    let match;
    
    while ((match = liPattern.exec(html)) !== null) {
      const liContent = match[1];
      // 排除推荐阅读板块
      if (recommendationKeywords.some(keyword => liContent.includes(keyword))) {
        continue;
      }
      const newsItem = this.parseWellanNewsItem(liContent, baseUrl);
      if (newsItem) {
        newsList.push(newsItem);
      }
    }
    
    // 方法2: 如果li方法不够，尝试直接匹配链接
    if (newsList.length < 3) {
      const directPattern = /<a[^>]+href=["']?([^"'>]+)["']?[^>]*title=["']?([^"']*)["']?[^>]*>([^<]+)<\/a>/g;
      while ((match = directPattern.exec(html)) !== null) {
        const href = match[1];
        const title = match[3] || match[2];
        
        if (this.isValidWellanTitle(title) && this.isValidNewsLink(href, title)) {
          // 尝试从URL中提取日期
          const urlDateMatch = href.match(/\/(\d{4})\/(\d{2})(\d{2})\//);
          let date = '';
          if (urlDateMatch) {
            date = `${urlDateMatch[1]}.${urlDateMatch[2]}.${urlDateMatch[3]}`;
          }
          
          // 文澜列表页通常有日期，没有日期的直接丢弃（避免正文摘要被误当标题）
          if (!date) {
            continue;
          }
          
          const newsItem = {
            id: Date.now() + Math.random(),
            title: title.trim(),
            url: this.buildFullUrl(href, baseUrl),
            date: date || new Date().toISOString().split('T')[0],
            dateObj: date ? new Date(date.replace(/\./g, '-')) : new Date(),
            source: '文澜新闻'
          };
          newsList.push(newsItem);
        }
      }
    }
    
    return newsList;
  },
  
  // 解析文澜新闻项
  parseWellanNewsItem(liContent, baseUrl) {
    // 排除推荐阅读/相关阅读
    if (/推荐阅读|相关推荐|相关阅读|热门阅读|热点阅读/i.test(liContent)) {
      return null;
    }

    // 优先使用带title属性的链接，避免抓到正文摘要
    const linkWithTitlePattern = /<a[^>]+href=["']?([^"'>]+)["']?[^>]*title=["']?([^"']+)["']?[^>]*>([\s\S]*?)<\/a>/i;
    const linkWithoutTitlePattern = /<a[^>]+href=["']?([^"'>]+)["']?[^>]*>([^<]+)<\/a>/i;
    
    let href = null;
    let title = null;

    const linkWithTitleMatch = liContent.match(linkWithTitlePattern);
    if (linkWithTitleMatch) {
      href = linkWithTitleMatch[1];
      title = (linkWithTitleMatch[2] || '').trim();
    } else {
      const linkWithoutTitleMatch = liContent.match(linkWithoutTitlePattern);
      if (linkWithoutTitleMatch) {
        href = linkWithoutTitleMatch[1];
        title = (linkWithoutTitleMatch[2] || '').trim();
      }
    }

    // 标题过滤，避免把正文摘要当标题（例如“新闻网讯...”）
    if (!this.isValidWellanTitle(title)) {
      return null;
    }
    
    // 查找日期（文澜列表正常都带日期，没有日期直接丢弃）
    const datePatterns = [
      /(\d{4}\.\d{2}\.\d{2})/,
      /(\d{4}\.\d{2})/,
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{4}年\d{2}月\d{2}日)/
    ];
    
    let date = '';
    for (const pattern of datePatterns) {
      const dateMatch = liContent.match(pattern);
      if (dateMatch) {
        date = dateMatch[1];
        // 转换中文日期格式为ISO格式
        if (date.includes('年') && date.includes('月')) {
          date = date.replace('年', '-').replace('月', '-').replace('日', '');
        }
        break;
      }
    }

    if (!date) {
      return null;
    }
    
    if (href && title) {
      if (this.isValidNewsLink(href, title)) {
        return {
          id: Date.now() + Math.random(),
          title: title.trim(),
          url: this.buildFullUrl(href, baseUrl),
          date: date || new Date().toISOString().split('T')[0],
          dateObj: date ? new Date(date.replace(/\./g, '-')) : new Date(),
          source: '文澜新闻'
        };
      }
    }
    return null;
  },

  // 文澜标题过滤：排除正文摘要/通讯员类文本
  isValidWellanTitle(title) {
    if (!title) return false;

    const cleaned = title.trim();
    if (cleaned.length < 6) return false;

    // 排除常见摘要开头
    if (/^(新闻网讯|通讯员|记者|报道|消息)/.test(cleaned)) {
      return false;
    }

    // 排除明显是正文段落的句式（含多个标点或过长句子）
    const punctuationCount = (cleaned.match(/[，。；：、]/g) || []).length;
    if (punctuationCount >= 3 && cleaned.length > 35) {
      return false;
    }

    return true;
  },

  // 去重：相同标题/日期或相同链接只保留一条
  dedupeNewsList(newsList) {
    if (!Array.isArray(newsList)) return [];
    const seen = new Set();

    return newsList.filter(item => {
      const titleKey = (item.title || '').trim().replace(/\s+/g, '');
      const dateKey = (item.date || '').trim();
      const rawUrl = (item.url || '').trim();
      const normalizedUrl = rawUrl
        .replace(/^https?:\/\//i, '')
        .replace(/#.*$/, '')
        .replace(/\?.*$/, '')
        .replace(/\/+$/, '');

      const titleDateKey = `${titleKey}|${dateKey}`;
      const urlTitleKey = `${normalizedUrl}|${titleKey}`;

      if (seen.has(titleDateKey) || seen.has(urlTitleKey)) {
        return false;
      }
      seen.add(titleDateKey);
      seen.add(urlTitleKey);
      return true;
    });
  }
})