const CACHE_NAME = 'handywote-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/avatar.webp',
  '/manifest.json'
];

// 安装事件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // 过滤掉无法获取的资源
        const validUrls = urlsToCache.filter(url => {
          // 基本的URL验证
          try {
            new URL(url, self.location.origin);
            return true;
          } catch (e) {
            console.warn('Invalid URL in cache list:', url);
            return false;
          }
        });
        
        // 逐个添加缓存项，避免一个失败导致全部失败
        const addCachePromises = validUrls.map(url => {
          return fetch(url)
            .then(response => {
              if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.status}`);
              }
              return cache.put(url, response);
            })
            .catch(error => {
              console.warn(`Failed to cache ${url}:`, error);
              // 不要reject，这样其他资源仍可以被缓存
              return null;
            });
        });
        
        return Promise.all(addCachePromises);
      })
      .then(() => {
        // 跳过等待状态，立即激活
        return self.skipWaiting();
      })
  );
});

// 激活事件
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
  // 对于不是GET请求的，直接转发
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果在缓存中找到响应，则返回缓存的响应
        if (response) {
          return response;
        }
        
        // 否则，发起网络请求
        return fetch(event.request).then(
          response => {
            // 检查是否是有效的响应
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆响应，因为响应流只能使用一次
            const responseToCache = response.clone();
            
            // 将新响应添加到缓存
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                // 缓存失败不应该影响响应
                console.warn('Failed to cache response:', error);
              });
            
            return response;
          }
        )
        .catch(error => {
          // 网络请求失败，返回错误响应或默认响应
          console.warn('Network request failed:', error);
          return new Response('Network error', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
      .catch(error => {
        // 缓存匹配失败，直接发起网络请求
        console.warn('Cache match failed:', error);
        return fetch(event.request);
      })
  );
});
