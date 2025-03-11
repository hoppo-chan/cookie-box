// 内容脚本
console.log("饼干盒子内容脚本已加载");

// 获取所有本地存储数据
function getAllStorage() {
  const data = {
    localStorage: {},
    sessionStorage: {},
  };

  // 获取localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data.localStorage[key] = localStorage.getItem(key);
    }
  } catch (e) {
    console.error("获取localStorage失败:", e);
  }

  // 获取sessionStorage
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      data.sessionStorage[key] = sessionStorage.getItem(key);
    }
  } catch (e) {
    console.error("获取sessionStorage失败:", e);
  }

  return data;
}

// 设置所有本地存储数据
function setAllStorage(data) {
  // 设置localStorage
  if (data.localStorage) {
    try {
      localStorage.clear();
      for (const key in data.localStorage) {
        localStorage.setItem(key, data.localStorage[key]);
      }
    } catch (e) {
      console.error("设置localStorage失败:", e);
    }
  }

  // 设置sessionStorage
  if (data.sessionStorage) {
    try {
      sessionStorage.clear();
      for (const key in data.sessionStorage) {
        sessionStorage.setItem(key, data.sessionStorage[key]);
      }
    } catch (e) {
      console.error("设置sessionStorage失败:", e);
    }
  }
}

// 向window对象添加标记，表示content script已加载
window._cookieBoxContentScriptLoaded = true;

// 使用Promise包装的消息发送函数
function sendMessagePromise(message) {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage(message).then(resolve).catch(reject);
  });
}

// 通过消息传递与popup和background交互
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 响应ping请求，用于检查content script是否已加载
  if (request.action === "ping") {
    return Promise.resolve({ status: "ok" });
  }

  const url = window.location.href;

  if (request.action === "getAllData") {
    try {
      // 获取当前页面的储存数据
      const storageData = getAllStorage();

      // 发送消息到background script获取Cookies
      return sendMessagePromise({
        action: "getCookies",
        url: url,
      }).then((response) => {
        if (response.error) {
          return Promise.reject(response.error);
        }

        return {
          storage: storageData,
          cookies: response.cookies || [],
          url: url,
        };
      });
    } catch (error) {
      console.error("获取数据时出错:", error);
      return Promise.reject(error.message || "获取数据失败");
    }
  }

  if (request.action === "setAllData") {
    try {
      // 设置存储数据
      setAllStorage(request.data.storage);

      // 设置Cookies
      if (request.data.cookies && request.data.cookies.length) {
        // 处理Cookie设置的响应
        const cookiePromises = request.data.cookies.map((cookie) => {
          console.log(
            `尝试设置cookie: ${cookie.name}, 域: ${
              cookie.domain || "当前域"
            }, 路径: ${cookie.path || "/"}`
          );

          return sendMessagePromise({
            action: "setCookie",
            cookie: cookie,
            url: url,
          })
            .then((response) => {
              if (!response.success) {
                let errorMessage = response.error || "未知错误";
                console.error(
                  `设置cookie ${cookie.name} 失败: ${errorMessage}`
                );

                // 处理file://协议的特殊情况
                if (response.isFileProtocol) {
                  // 如果是在本地文件上尝试设置cookie
                  console.warn("在本地文件上操作cookie受限，此错误是预期的");

                  // 向页面显示更友好的提示
                  if (window.location.href.startsWith("file://")) {
                    const event = new CustomEvent(
                      "cookie-manager-notification",
                      {
                        detail: {
                          message:
                            "无法在本地文件页面设置cookie。请在网站页面上使用此功能。",
                          type: "warning",
                        },
                      }
                    );
                    window.dispatchEvent(event);
                  }
                }

                return {
                  name: cookie.name,
                  success: false,
                  error: errorMessage,
                  isFileProtocol: response.isFileProtocol,
                };
              } else {
                console.log(`设置cookie ${cookie.name} 成功`);
                return {
                  name: cookie.name,
                  success: true,
                  result: response.result,
                };
              }
            })
            .catch((error) => {
              console.error(`设置cookie ${cookie.name} 时发生异常:`, error);
              return {
                name: cookie.name,
                success: false,
                error: error.message || "未知异常",
              };
            });
        });

        return Promise.all(cookiePromises).then((results) => {
          const successCount = results.filter((r) => r.success).length;
          const failCount = results.length - successCount;

          console.log(
            `Cookie设置完成. 成功: ${successCount}, 失败: ${failCount}`
          );

          if (failCount > 0) {
            console.warn("部分cookie设置失败，但流程将继续");
            return {
              success: true,
              warning: "部分cookie设置失败",
              results: results,
            };
          } else {
            return { success: true, results: results };
          }
        });
      } else {
        console.log("没有提供cookie数据，跳过cookie设置");
        return Promise.resolve({ success: true });
      }
    } catch (error) {
      console.error("设置数据时出错:", error);
      return Promise.resolve({
        success: true,
        warning: error.message || "设置数据过程中出错，但流程将继续",
      });
    }
  }

  if (request.action === "clearAllData") {
    try {
      // 清除本地存储
      try {
        localStorage.clear();
        sessionStorage.clear();
        console.log("本地存储和会话存储已清除");
      } catch (e) {
        console.error("清除存储失败:", e);
      }

      // 获取并清除所有Cookie
      return sendMessagePromise({
        action: "getCookies",
        url: url,
      }).then((response) => {
        if (response.error) {
          console.error("获取Cookies失败:", response.error);
          return Promise.reject(response.error);
        }

        if (response.cookies && response.cookies.length) {
          console.log(`正在清除 ${response.cookies.length} 个cookie`);

          // 采用两种不同的URL策略来删除cookie
          const cookiePromises = response.cookies.map((cookie) => {
            return new Promise((resolve, reject) => {
              // 构建一个URL，如果cookie有domain属性，使用它
              let cookieUrl = url;

              // 如果cookie有特定的domain，使用它来构建URL
              if (cookie.domain) {
                // 构建URL时要考虑协议和路径
                // 确定协议
                const protocol = url.startsWith("https")
                  ? "https://"
                  : "http://";

                // 处理domain，移除前导点
                let domain = cookie.domain;
                if (domain.startsWith(".")) {
                  domain = domain.substring(1);
                }

                // 构建URL
                cookieUrl = `${protocol}${domain}`;

                // 如果有路径，添加路径
                if (cookie.path && cookie.path !== "/") {
                  cookieUrl += cookie.path;
                }
              }

              console.log(`尝试删除cookie: ${cookie.name}, URL: ${cookieUrl}`);

              sendMessagePromise({
                action: "removeCookie",
                cookie: cookie,
                url: cookieUrl,
              })
                .then((result) => {
                  if (result.error) {
                    // 如果第一次尝试失败，尝试使用不同的URL规则
                    console.log(
                      `第一次尝试删除cookie ${cookie.name} 失败，尝试使用原始URL`
                    );

                    return sendMessagePromise({
                      action: "removeCookie",
                      cookie: cookie,
                      url: url, // 使用原始页面URL
                    });
                  }
                  return result;
                })
                .then((result) => {
                  if (result.error) {
                    console.error(
                      `两次尝试都无法删除cookie ${cookie.name}: ${result.error}`
                    );
                    resolve({
                      name: cookie.name,
                      success: false,
                      error: result.error,
                    });
                  } else {
                    console.log(`成功删除cookie ${cookie.name}`);
                    resolve({ name: cookie.name, success: true });
                  }
                })
                .catch((error) => {
                  console.error(`删除cookie出错: ${error}`);
                  resolve({
                    name: cookie.name,
                    success: false,
                    error: error.toString(),
                  });
                });
            });
          });

          return Promise.all(cookiePromises).then((results) => {
            const successCount = results.filter((r) => r.success).length;
            const failCount = results.length - successCount;

            console.log(
              `Cookie清除完成. 成功: ${successCount}, 失败: ${failCount}`
            );

            if (failCount > 0) {
              console.warn("部分cookie未能成功清除");
              // 记录失败的cookie
              const failedCookies = results.filter((r) => !r.success);
              console.warn(
                "失败的cookie:",
                failedCookies.map((c) => c.name).join(", ")
              );
            }

            // 返回详细结果
            return {
              success: true,
              results: results,
              warning:
                failCount > 0
                  ? `有${failCount}个cookie未能成功清除`
                  : undefined,
            };
          });
        } else {
          console.log("没有发现需要清除的cookie");
          return Promise.resolve({ success: true });
        }
      });
    } catch (error) {
      console.error("清除数据时出错:", error);
      return Promise.resolve({
        success: false,
        error: error.message || "清除数据失败",
      });
    }
  }

  // 如果没有处理请求，返回null
  return null;
});
