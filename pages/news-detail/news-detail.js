// news-detail.js
Page({
  data: {
    news: null,
    content: '',
    contentHtml: [],
    loading: false,
    fontSize: 32,
    lineHeight: 1.6,
    isFavorite: false
  },
  
  onLoad(options) {
    // 页面加载时，如果有新闻参数，则解析
    if (options.news) {
      const news = JSON.parse(decodeURIComponent(options.news));
      this.setData({
        news: news
      });
      this.markRead(news);
      this.updateFavoriteState(news);
      // 自动提取新闻正文
      this.fetchNewsContent();
    }
  },
  
  buildNewsKey(news) {
    const titleKey = (news.title || '').trim().replace(/\s+/g, '');
    const urlKey = (news.url || '').trim();
    return `${urlKey}|${titleKey}`;
  },

  markRead(news) {
    if (!news) return;
    const key = this.buildNewsKey(news);
    const readMap = wx.getStorageSync('readNewsMap') || {};
    readMap[key] = true;
    wx.setStorageSync('readNewsMap', readMap);
  },

  updateFavoriteState(news) {
    if (!news) return;
    const favoriteMap = wx.getStorageSync('favoriteNewsMap') || {};
    const isFavorite = !!favoriteMap[this.buildNewsKey(news)];
    this.setData({
      isFavorite
    });
  },

  toggleFavorite() {
    const news = this.data.news;
    if (!news) return;
    const key = this.buildNewsKey(news);
    const favoriteMap = wx.getStorageSync('favoriteNewsMap') || {};
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

    wx.setStorageSync('favoriteNewsMap', favoriteMap);
    wx.setStorageSync('favoriteNewsData', favoriteData);
    this.setData({
      isFavorite: !!favoriteMap[key]
    });
  },

  increaseFont() {
    const nextSize = Math.min(this.data.fontSize + 2, 40);
    this.setData({
      fontSize: nextSize
    });
  },

  decreaseFont() {
    const nextSize = Math.max(this.data.fontSize - 2, 26);
    this.setData({
      fontSize: nextSize
    });
  },

  previewImage(e) {
    const src = e.currentTarget.dataset.src;
    if (!src) return;
    
    const imageUrls = this.data.contentHtml
      .filter(node => node.type === 'image' && node.imgType === 'content')
      .map(node => node.src);
    
    if (imageUrls.length === 0) return;
    
    wx.previewImage({
      current: src,
      urls: imageUrls
    });
  },

  fetchNewsContent() {
    if (!this.data.news || !this.data.news.url) {
      wx.showToast({
        title: '新闻URL无效',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      loading: true
    });
    
    wx.request({
      url: this.data.news.url,
      method: 'GET',
      success: (res) => {
        const html = res.data;
        const result = this.extractContentFromHTML(html, this.data.news.url);
        
        this.setData({
          content: result.text,
          contentHtml: result.nodes,
          loading: false
        });
        
        if (!result.text) {
          wx.showToast({
            title: '未提取到正文内容',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取新闻正文失败', err);
        this.setData({
          loading: false
        });
        wx.showToast({
          title: '网络受限，请稍后重试或查看原文',
          icon: 'none',
          duration: 3000
        });
      }
    });
  },
  
  // 从HTML中提取正文内容
  extractContentFromHTML(html, url = '') {
    let contentHtml = '';
    let websiteType = '';
    
    if (url && url.includes('jwc.zuel.edu.cn')) {
      websiteType = 'jwc';
    } else if (url && url.includes('tw.zuel.edu.cn')) {
      websiteType = 'tw';
    } else if (url && url.includes('wellan.zuel.edu.cn')) {
      websiteType = 'wellan';
    } else if (html.includes('jwc.zuel.edu.cn')) {
      websiteType = 'jwc';
    } else if (html.includes('tw.zuel.edu.cn')) {
      websiteType = 'tw';
    } else if (html.includes('wellan.zuel.edu.cn')) {
      websiteType = 'wellan';
    }
    
    switch (websiteType) {
      case 'jwc':
        contentHtml = this.extractJWCContentHtml(html);
        break;
      case 'tw':
        contentHtml = this.extractTWContentHtml(html);
        break;
      case 'wellan':
        contentHtml = this.extractWellanContentHtml(html);
        break;
      default:
        contentHtml = this.extractGeneralContentHtml(html);
        break;
    }
    
    contentHtml = this.processHTMLEntities(contentHtml);
    
    const nodes = this.parseHtmlToNodes(contentHtml, url, websiteType);
    const text = this.extractTextFromHtml(contentHtml);
    const cleanedText = this.normalizeParagraphText(text);
    const finalText = this.cleanFooterContent(cleanedText);
    
    return { text: finalText, nodes: nodes };
  },
  
  parseHtmlToNodes(html, baseUrl, websiteType = '') {
    const nodes = [];
    
    const tablePattern = /<table[^>]*>[\s\S]*?<\/table>/gi;
    const tables = [];
    let match;
    
    while ((match = tablePattern.exec(html)) !== null) {
      tables.push({
        html: match[0],
        index: match.index,
        length: match[0].length
      });
    }
    
    const parts = [];
    let lastEnd = 0;
    
    for (const table of tables) {
      if (table.index > lastEnd) {
        parts.push({ type: 'html', content: html.substring(lastEnd, table.index) });
      }
      parts.push({ type: 'table', content: table.html });
      lastEnd = table.index + table.length;
    }
    
    if (lastEnd < html.length) {
      parts.push({ type: 'html', content: html.substring(lastEnd) });
    }
    
    if (parts.length === 0) {
      parts.push({ type: 'html', content: html });
    }
    
    for (const part of parts) {
      if (part.type === 'table') {
        const tableData = this.parseTable(part.content, baseUrl);
        if (tableData && tableData.rows && tableData.rows.length > 0) {
          nodes.push({ type: 'table', data: tableData });
        }
      } else {
        this.parseHtmlPart(part.content, nodes, baseUrl, websiteType);
      }
    }
    
    this.cleanNodesFooter(nodes);
    
    return nodes;
  },
  
  parseHtmlPart(html, nodes, baseUrl, websiteType) {
    const imgPattern = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let match;
    let lastEnd = 0;
    
    while ((match = imgPattern.exec(html)) !== null) {
      if (match.index > lastEnd) {
        const textBetween = html.substring(lastEnd, match.index);
        const cleanText = this.cleanTextNode(textBetween, websiteType);
        if (cleanText.trim()) {
          nodes.push({ type: 'text', content: cleanText });
        }
      }
      
      let imgUrl = match[1];
      if (imgUrl && !imgUrl.startsWith('http')) {
        if (imgUrl.startsWith('//')) {
          imgUrl = 'https:' + imgUrl;
        } else if (imgUrl.startsWith('/')) {
          const baseMatch = baseUrl.match(/^https?:\/\/[^/]+/);
          if (baseMatch) {
            imgUrl = baseMatch[0] + imgUrl;
          }
        } else {
          const baseMatch = baseUrl.match(/^https?:\/\/[^/]+/);
          if (baseMatch) {
            imgUrl = baseMatch[0] + '/' + imgUrl;
          }
        }
      }
      
      const imgType = this.getImageType(imgUrl);
      if (imgType === 'content') {
        nodes.push({ type: 'image', src: imgUrl, imgType: imgType });
      }
      lastEnd = match.index + match[0].length;
    }
    
    if (lastEnd < html.length) {
      const remaining = html.substring(lastEnd);
      const cleanText = this.cleanTextNode(remaining, websiteType);
      if (cleanText.trim()) {
        nodes.push({ type: 'text', content: cleanText });
      }
    }
    
    if (nodes.length === 0 || (nodes.length === 1 && nodes[0].type === 'text' && !nodes[0].content.trim())) {
      const cleanText = this.cleanTextNode(html, websiteType);
      if (cleanText.trim()) {
        nodes.push({ type: 'text', content: cleanText });
      }
    }
  },
  
  parseTable(tableHtml, baseUrl) {
    const rows = [];
    
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    
    while ((rowMatch = rowPattern.exec(tableHtml)) !== null) {
      const rowHtml = rowMatch[1];
      const cells = [];
      
      const cellPattern = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      let cellMatch;
      
      while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
        let cellContent = cellMatch[1];
        
        cellContent = cellContent
          .replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, (match, src) => {
            let imgUrl = src;
            if (imgUrl && !imgUrl.startsWith('http')) {
              if (imgUrl.startsWith('//')) {
                imgUrl = 'https:' + imgUrl;
              } else if (imgUrl.startsWith('/')) {
                const baseMatch = baseUrl.match(/^https?:\/\/[^/]+/);
                if (baseMatch) {
                  imgUrl = baseMatch[0] + imgUrl;
                }
              }
            }
            return `[图片:${imgUrl}]`;
          })
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&amp;/gi, '&')
          .trim();
        
        cells.push(cellContent);
      }
      
      if (cells.length > 0) {
        rows.push(cells);
      }
    }
    
    return { rows };
  },
  
  getImageType(url) {
    if (!url) return 'content';
    
    const lowerUrl = url.toLowerCase();
    
    const iconPatterns = [
      /\/icons?\//i, /\/sys\//i, /\/system\/images\//i,
      /_icon\./i, /icon_\d*\./i, /btn\./i, /button\./i,
      /\/images\/btn\//i, /\/images\/icon\//i
    ];
    
    for (const pattern of iconPatterns) {
      if (pattern.test(lowerUrl)) {
        return 'icon';
      }
    }
    
    const docIconPatterns = [
      /docx?\.png/i, /docx?\.gif/i, /docx?\.jpg/i,
      /xlsx?\.png/i, /xlsx?\.gif/i, /xlsx?\.jpg/i,
      /pdf\.png/i, /pdf\.gif/i, /pdf\.jpg/i,
      /pptx?\.png/i, /pptx?\.gif/i, /pptx?\.jpg/i,
      /word\.png/i, /excel\.png/i, /powerpoint\.png/i
    ];
    
    for (const pattern of docIconPatterns) {
      if (pattern.test(lowerUrl)) {
        return 'attachment';
      }
    }
    
    const attachIconPatterns = [
      /attach.*\.(png|gif|jpg|jpeg)$/i,
      /download.*\.(png|gif|jpg|jpeg)$/i
    ];
    
    for (const pattern of attachIconPatterns) {
      if (pattern.test(lowerUrl)) {
        return 'attachment';
      }
    }
    
    return 'content';
  },
  
  cleanTextNode(html, websiteType = '') {
    let text = this.stripHtmlKeepBreaks(html);
    
    text = text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+/, '')
      .replace(/\n+$/, '')
      .trim();
    
    if (websiteType === 'wellan') {
      text = text
        .replace(/发布时间[：:]\s*\d{4}[-./]\d{1,2}[-./]\d{1,2}[\s\S]*?(?=\n|$)/gi, '')
        .replace(/作者[：:][\s\S]*?(?=\n|$)/gi, '')
        .replace(/来源[：:][\s\S]*?(?=\n|$)/gi, '')
        .replace(/点击[：:]\s*\d+[\s\S]*?(?=\n|$)/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }
    
    return text;
  },
  
  cleanNodesFooter(nodes) {
    const footerKeywords = [
      '版权所有', '备案号', '公安备案', 'ICP备',
      '技术支持', 'Copyright'
    ];
    
    const contactKeywords = ['地址：', '邮编：', '电话：', '联系电话：'];
    
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (node.type !== 'text') continue;
      
      const content = node.content;
      const lines = content.split('\n');
      
      let cutLineIndex = -1;
      for (let j = lines.length - 1; j >= 0; j--) {
        const line = lines[j].trim();
        
        for (const keyword of footerKeywords) {
          if (line.includes(keyword) && j > lines.length * 0.3) {
            cutLineIndex = j;
            break;
          }
        }
        
        if (cutLineIndex === -1) {
          for (const keyword of contactKeywords) {
            if (line.includes(keyword) && j > lines.length * 0.6) {
              cutLineIndex = j;
              break;
            }
          }
        }
        
        if (cutLineIndex !== -1) break;
      }
      
      if (cutLineIndex !== -1 && cutLineIndex > 0) {
        node.content = lines.slice(0, cutLineIndex).join('\n').trim();
        nodes.splice(i + 1);
        break;
      }
    }
    
    while (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      if (lastNode.type === 'text' && !lastNode.content.trim()) {
        nodes.pop();
      } else {
        break;
      }
    }
  },
  
  extractTextFromHtml(html) {
    return html
      .replace(/<img[^>]*>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '');
  },
  
  extractJWCContentHtml(html) {
    const contentPatterns = [
      /<div[^>]*class=["'][^"']*wp_articlecontent[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=["'][^"']*v_news_content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=["'][^"']*main-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    ];
    
    for (const pattern of contentPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let content = match[1];
        content = this.cleanContentHtml(content);
        if (content.trim().length > 50) {
          return content;
        }
      }
    }
    
    const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    return paragraphs.join('\n');
  },
  
  extractTWContentHtml(html) {
    const articlePattern = /<article[^>]*>([\s\S]*?)<\/article>/i;
    const articleMatch = html.match(articlePattern);
    
    if (articleMatch) {
      return this.cleanContentHtml(articleMatch[1]);
    }
    
    const mainContentPattern = /<div[^>]*class=["']?wp_articlecontent["']?[^>]*>([\s\S]*?)<\/div>/i;
    const mainContentMatch = html.match(mainContentPattern);
    if (mainContentMatch) {
      return this.cleanContentHtml(mainContentMatch[1]);
    }
    
    const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    return paragraphs.join('\n');
  },
  
  extractWellanContentHtml(html) {
    const contentPatterns = [
      /<div[^>]*class=["'][^"']*wp_articlecontent[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=["'][^"']*article-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=["'][^"']*v_news_content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
    ];
    
    for (const pattern of contentPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let content = this.cleanContentHtml(match[1]);
        content = this.cleanWellanContent(content);
        if (content.trim().length > 50) {
          return content;
        }
      }
    }
    
    const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    let content = paragraphs.join('\n');
    content = this.cleanWellanContent(content);
    return content;
  },
  
  cleanWellanContent(html) {
    let cleaned = html
      .replace(/<div[^>]*class=["'][^"']*article-info[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class=["'][^"']*info[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<span[^>]*class=["'][^"']*date[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '')
      .replace(/<span[^>]*class=["'][^"']*source[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '')
      .replace(/<div[^>]*class=["'][^"']*copyright[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class=["'][^"']*footer[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*id=["'][^"']*copyright[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*id=["'][^"']*footer[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
    
    return cleaned;
  },
  
  extractGeneralContentHtml(html) {
    let cleanedHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
    
    const paragraphs = cleanedHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    if (paragraphs.length > 0) {
      return paragraphs.join('\n');
    }
    
    return cleanedHtml;
  },
  
  cleanContentHtml(html) {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
      .replace(/<!--[\s\S]*?-->/g, '');
  },
  
  // 处理HTML实体符号，支持多种变体
  processHTMLEntities(text) {
    return text
      // 处理空格实体的各种变体
      .replace(/&nbsp;/gi, ' ') // 标准&nbsp;
      .replace(/&nbsp/gi, ' ') // 无分号变体
      .replace(/&#160;/gi, ' ') // 十进制空格
      .replace(/&#xA0;/gi, ' ') // 十六进制空格
      // 处理其他常见实体
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&ldquo;/gi, '"')
      .replace(/&rdquo;/gi, '"')
      .replace(/&lsquo;/gi, "'")
      .replace(/&rsquo;/gi, "'")
      .replace(/&mdash;/gi, '—')
      .replace(/&ndash;/gi, '-')
      .replace(/&hellip;/gi, '...')
      .replace(/&times;/gi, '×')
      .replace(/&divide;/gi, '÷');
  },

  // 保留段落的HTML清理
  stripHtmlKeepBreaks(html) {
    if (!html) return '';

    return html
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/p\s*>/gi, '\n\n')
      .replace(/<\/div\s*>/gi, '\n')
      .replace(/<\/li\s*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  },

  normalizeParagraphText(text) {
    if (!text) return '';

    let normalized = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+/, '')
      .replace(/\n+$/, '')
      .trim();

    return normalized;
  },

  normalizeNumberSpacing(text) {
    return text
      .replace(/(\d)\s+(\d)/g, '$1$2')
      .replace(/(\d)\s*[-–—]\s*(\d)/g, '$1-$2');
  },

  cleanFooterContent(text) {
    if (!text) return text;

    const lines = text.split('\n');
    const footerKeywords = ['版权所有', '备案号', '公安备案', 'ICP备', '技术支持', 'Copyright'];
    const contactKeywords = ['地址：', '邮编：', '电话：', '联系电话：'];
    
    let cutIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      
      for (const keyword of footerKeywords) {
        if (line.includes(keyword)) {
          cutIndex = i;
          break;
        }
      }
      
      if (cutIndex === -1) {
        for (const keyword of contactKeywords) {
          if (line.includes(keyword) && i > lines.length * 0.5) {
            cutIndex = i;
            break;
          }
        }
      }
      
      if (cutIndex !== -1) break;
    }
    
    let result;
    if (cutIndex !== -1) {
      result = lines.slice(0, cutIndex).join('\n');
    } else {
      result = text;
    }

    result = result
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+/, '')
      .replace(/\n+$/, '')
      .trim();

    return result;
  },

  viewOriginal() {
    if (!this.data.news || !this.data.news.url) {
      wx.showToast({
        title: '新闻URL无效',
        icon: 'none'
      });
      return;
    }
    
    // 直接复制链接到剪贴板
    this.copyNewsUrl();
  },
  
  // 复制新闻链接
  copyNewsUrl() {
    if (!this.data.news || !this.data.news.url) {
      wx.showToast({
        title: '新闻URL无效',
        icon: 'none'
      });
      return;
    }
    
    wx.setClipboardData({
      data: this.data.news.url,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success',
          duration: 1500
        });
      },
      fail: (err) => {
        console.error('复制链接失败', err);
        wx.showToast({
          title: '复制失败，请手动复制',
          icon: 'none'
        });
      }
    });
  },

  // 分享给好友
  onShareAppMessage() {
    const news = this.data.news;
    if (!news) {
      return {
        title: '章鱼的高效助手 - 校园资讯',
        path: '/pages/index/index'
      };
    }
    
    return {
      title: news.title || '校园新闻分享',
      path: '/pages/news-detail/news-detail?news=' + encodeURIComponent(JSON.stringify(news)),
      imageUrl: ''
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const news = this.data.news;
    if (!news) {
      return {
        title: '章鱼的高效助手 - 校园资讯',
        query: ''
      };
    }
    
    return {
      title: news.title || '校园新闻分享',
      query: 'news=' + encodeURIComponent(JSON.stringify(news))
    };
  }
})