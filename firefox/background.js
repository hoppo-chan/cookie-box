// 后台脚本
browser.runtime.onInstalled.addListener(() => {
  console.log("饼干盒子扩展已安装");
});

// 检查并确保content script已加载
async function ensureContentScriptLoaded(tabId) {
  return new Promise((resolve) => {
    try {
      // 先尝试发送一个ping消息检查content script是否已加载
      browser.tabs.sendMessage(tabId, { action: "ping" }).then(
        (response) => {
          // content script已加载
          resolve(true);
        },
        (error) => {
          // 如果出错，说明content script可能未加载，尝试注入
          browser.tabs.executeScript(tabId, { file: "content.js" }).then(
            () => {
              resolve(true);
            },
            (injectError) => {
              console.error("注入content script失败:", injectError);
              resolve(false);
            }
          );
        }
      );
    } catch (e) {
      console.error("检查content script状态出错:", e);
      resolve(false);
    }
  });
}

// 当popup打开时触发的事件
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ensureContentScriptLoaded") {
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        if (tabs.length === 0) {
          return Promise.resolve({
            success: false,
            error: "没有找到活动标签页",
          });
        }

        return ensureContentScriptLoaded(tabs[0].id).then((result) => {
          return { success: result };
        });
      })
      .then(sendResponse);
    return true; // 异步响应需要返回true
  }

  // 处理来自content script的消息
  if (request.action === "getCookies") {
    try {
      browser.cookies
        .getAll({ url: request.url })
        .then((cookies) => {
          sendResponse({ cookies: cookies });
        })
        .catch((error) => {
          sendResponse({ error: error.message });
        });
    } catch (e) {
      sendResponse({ error: e.message });
    }
    return true; // 异步响应需要返回true
  }

  if (request.action === "setCookie") {
    try {
      const cookie = request.cookie;
      const url = request.url;

      // 检查是否是file://协议
      if (url.startsWith("file://")) {
        console.warn(
          `无法在本地文件(${url})上设置cookie: Firefox不允许在file://协议上操作cookie`
        );
        sendResponse({
          success: false,
          error:
            "Firefox不允许在本地文件上设置cookie。请在网站页面上使用此功能。",
          isFileProtocol: true,
        });
        return true;
      }

      const cookieParams = {
        url: url,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        expirationDate: cookie.expirationDate,
      };

      console.log(
        `尝试设置cookie: ${cookie.name}`,
        JSON.stringify(cookieParams)
      );

      // 设置cookie之前先尝试删除同名cookie，以避免冲突
      browser.cookies
        .remove({
          url: url,
          name: cookie.name,
        })
        .finally(() => {
          // 忽略删除结果，无论成功失败都继续设置新cookie
          console.log(`准备设置cookie: ${cookie.name}`);

          // 添加小延迟确保删除操作完成
          setTimeout(() => {
            browser.cookies.set(cookieParams).then(
              (result) => {
                if (result) {
                  console.log(`成功设置cookie: ${cookie.name}`, result);
                  sendResponse({ success: true, result: result });
                } else {
                  console.error(`设置cookie ${cookie.name} 失败: 返回结果为空`);
                  sendResponse({
                    success: false,
                    error: "设置cookie失败，无返回结果",
                  });
                }
              },
              (error) => {
                console.error(`设置cookie失败: ${error.message}`);
                sendResponse({
                  success: false,
                  error: `设置cookie失败: ${error.message}`,
                });
              }
            );
          }, 100);
        });
    } catch (e) {
      console.error(`设置cookie出错: ${e.message}`, e);
      sendResponse({
        success: false,
        error: `设置cookie出错: ${e.message}`,
      });
    }
    return true;
  }

  if (request.action === "removeCookie") {
    try {
      const cookie = request.cookie;
      const url = request.url;

      console.log(`开始处理删除cookie请求: ${cookie.name}, URL: ${url}`);

      // 构建删除cookie所需的参数 - 只使用url和name
      const removeParams = {
        url: url,
        name: cookie.name,
      };

      // 不要包含domain和path参数，浏览器API不支持这些参数
      console.log(
        `尝试删除cookie: ${cookie.name}`,
        JSON.stringify(removeParams)
      );

      browser.cookies.remove(removeParams).then(
        (result) => {
          if (result) {
            console.log(`成功删除cookie: ${cookie.name}, 结果:`, result);
            sendResponse({ success: true });
          } else {
            // 某些情况下result可能为null，但这并不一定意味着失败
            console.log(`删除cookie ${cookie.name} 返回空结果，可能已不存在`);
            sendResponse({ success: true, warning: "返回结果为空" });
          }
        },
        (error) => {
          console.error(`删除cookie失败: ${error.message}`);

          // 如果是因为无法找到cookie导致的错误，提供更具体的信息
          if (error.message.includes("No cookie found")) {
            console.log(
              `没有找到匹配的cookie: ${cookie.name}, 匹配参数:`,
              JSON.stringify(removeParams)
            );
          }

          sendResponse({ error: error.message });
        }
      );
    } catch (e) {
      console.error(`删除cookie出错: ${e.message}`, e);
      sendResponse({ error: e.message });
    }
    return true;
  }
});
