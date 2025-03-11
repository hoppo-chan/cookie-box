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

// 通过消息传递与popup和background交互
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 响应ping请求，用于检查content script是否已加载
  if (request.action === "ping") {
    sendResponse({ status: "ok" });
    return;
  }

  const url = window.location.href;

  if (request.action === "getAllData") {
    try {
      // 获取当前页面的储存数据
      const storageData = getAllStorage();

      // 发送消息到background script获取Cookies
      chrome.runtime.sendMessage(
        {
          action: "getCookies",
          url: url,
        },
        (response) => {
          if (response.error) {
            sendResponse({ error: response.error });
            return;
          }

          sendResponse({
            storage: storageData,
            cookies: response.cookies || [],
            url: url,
          });
        }
      );
    } catch (error) {
      console.error("获取数据时出错:", error);
      sendResponse({ error: error.message || "获取数据失败" });
    }
    return true; // 异步响应需要返回true
  }

  if (request.action === "setAllData") {
    try {
      console.log("开始设置所有数据");

      // 设置存储数据
      if (request.data.storage) {
        console.log("设置本地存储和会话存储");
        setAllStorage(request.data.storage);
      } else {
        console.log("没有提供存储数据，跳过存储设置");
      }

      // 设置Cookies
      if (request.data.cookies && request.data.cookies.length) {
        console.log(`开始设置 ${request.data.cookies.length} 个cookie`);

        // 处理Cookie设置的响应
        let cookiePromises = request.data.cookies.map((cookie) => {
          return new Promise((resolve, reject) => {
            console.log(
              `尝试设置cookie: ${cookie.name}, 域: ${
                cookie.domain || "当前域"
              }, 路径: ${cookie.path || "/"}`
            );

            chrome.runtime.sendMessage(
              {
                action: "setCookie",
                cookie: cookie,
                url: url,
              },
              (response) => {
                if (response.error) {
                  console.error(
                    `设置cookie ${cookie.name} 失败: ${response.error}`
                  );
                  // 不中断流程，记录错误并继续
                  resolve({
                    name: cookie.name,
                    success: false,
                    error: response.error,
                  });
                } else {
                  console.log(`设置cookie ${cookie.name} 成功`);
                  resolve({
                    name: cookie.name,
                    success: true,
                  });
                }
              }
            );
          });
        });

        Promise.all(cookiePromises)
          .then((results) => {
            const successCount = results.filter((r) => r.success).length;
            const failCount = results.length - successCount;

            console.log(
              `Cookie设置完成. 成功: ${successCount}, 失败: ${failCount}`
            );

            if (failCount > 0) {
              console.warn("部分cookie设置失败，但流程将继续");
              sendResponse({
                success: true,
                warning: "部分cookie设置失败",
                results: results,
              });
            } else {
              sendResponse({ success: true, results: results });
            }
          })
          .catch((error) => {
            console.error("设置cookie过程中出错:", error);
            // 依然返回成功，避免中断流程
            sendResponse({
              success: true,
              warning: error || "设置Cookie过程中出错，但流程将继续",
            });
          });
      } else {
        console.log("没有提供cookie数据，跳过cookie设置");
        sendResponse({ success: true });
      }
    } catch (error) {
      console.error("设置数据时出错:", error);
      // 尽量避免中断流程
      sendResponse({
        success: true,
        warning: error.message || "设置数据过程中出错，但流程将继续",
      });
    }
    return true;
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
      chrome.runtime.sendMessage(
        {
          action: "getCookies",
          url: url,
        },
        (response) => {
          if (response.error) {
            console.error("获取Cookies失败:", response.error);
            sendResponse({ error: response.error });
            return;
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

                console.log(
                  `尝试删除cookie: ${cookie.name}, URL: ${cookieUrl}`
                );

                chrome.runtime.sendMessage(
                  {
                    action: "removeCookie",
                    cookie: cookie,
                    url: cookieUrl,
                  },
                  (result) => {
                    if (result.error) {
                      // 如果第一次尝试失败，尝试使用不同的URL规则
                      console.log(
                        `第一次尝试删除cookie ${cookie.name} 失败，尝试使用原始URL`
                      );

                      chrome.runtime.sendMessage(
                        {
                          action: "removeCookie",
                          cookie: cookie,
                          url: url, // 使用原始页面URL
                        },
                        (secondResult) => {
                          if (secondResult.error) {
                            console.error(
                              `两次尝试都无法删除cookie ${cookie.name}: ${secondResult.error}`
                            );
                            resolve({
                              name: cookie.name,
                              success: false,
                              error: secondResult.error,
                            });
                          } else {
                            console.log(
                              `使用原始URL成功删除cookie ${cookie.name}`
                            );
                            resolve({ name: cookie.name, success: true });
                          }
                        }
                      );
                    } else {
                      console.log(`成功删除cookie ${cookie.name}`);
                      resolve({ name: cookie.name, success: true });
                    }
                  }
                );
              });
            });

            Promise.all(cookiePromises)
              .then((results) => {
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
                sendResponse({
                  success: true,
                  results: results,
                  warning:
                    failCount > 0
                      ? `有${failCount}个cookie未能成功清除`
                      : undefined,
                });
              })
              .catch((error) => {
                console.error("清除cookie过程中出错:", error);
                sendResponse({
                  success: false,
                  error: "清除cookie失败: " + (error.message || error),
                });
              });
          } else {
            console.log("没有发现需要清除的cookie");
            sendResponse({ success: true });
          }
        }
      );
    } catch (error) {
      console.error("清除数据时出错:", error);
      sendResponse({
        success: false,
        error: error.message || "清除数据失败",
      });
    }
    return true;
  }
});
