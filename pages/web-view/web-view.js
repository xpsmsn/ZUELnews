// web-view.js
Page({
  data: {
    url: '',
    loading: true,
    error: ''
  },
  
  onLoad(options) {
    if (options.url) {
      this.setData({
        url: decodeURIComponent(options.url),
        loading: true,
        error: ''
      });
    } else {
      this.setData({
        loading: false,
        error: 'URL无效，请返回上一页重试'
      });
    }
  },
  
  // 网页加载完成
  onWebViewLoad(e) {
    console.log('web-view加载完成', e);
    this.setData({
      loading: false,
      error: ''
    });
  },
  
  // 网页加载失败
  onWebViewError(e) {
    console.error('web-view加载失败', e);
    this.setData({
      loading: false,
      error: '加载失败，请检查网络连接或尝试复制链接到浏览器打开'
    });
  },
  
  // 重新加载
  reload() {
    this.setData({
      loading: true,
      error: ''
    });
    // 重新加载web-view
    const webViewContext = wx.createWebViewContext('web-view');
    webViewContext.reload();
  },
  
  // 复制链接
  copyUrl() {
    const url = this.data.url;
    if (url) {
      wx.setClipboardData({
        data: url,
        success: () => {
          wx.showToast({
            title: '链接已复制，请在浏览器中打开',
            icon: 'success',
            duration: 2000
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
    }
  }
})