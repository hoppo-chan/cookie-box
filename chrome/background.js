// 后台脚本
chrome.runtime.onInstalled.addListener(() => {
  console.log("饼干盒子扩展已安装");
});

// 检查并确保content script已加载
async function ensureContentScriptLoaded(tabId) {
  return new Promise((resolve) => {
    try {
      // 先尝试发送一个ping消息检查content script是否已加载
      chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
        if (chrome.runtime.lastError) {
          // 如果出错，说明content script可能未加载，尝试注入
          chrome.scripting.executeScript(
            {
              target: { tabId: tabId },
              files: ["content.js"],
            },
            () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "注入content script失败:",
                  chrome.runtime.lastError
                );
                resolve(false);
              } else {
                resolve(true);
              }
            }
          );
        } else {
          // content script已加载
          resolve(true);
        }
      });
    } catch (e) {
      console.error("检查content script状态出错:", e);
      resolve(false);
    }
  });
}

// 当popup打开时触发的事件
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ensureContentScriptLoaded") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ success: false, error: "没有找到活动标签页" });
        return;
      }

      const result = await ensureContentScriptLoaded(tabs[0].id);
      sendResponse({ success: result });
    });
    return true; // 异步响应需要返回true
  }

  // 处理来自content script的消息
  if (request.action === "getCookies") {
    try {
      chrome.cookies.getAll({ url: request.url }, (cookies) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ cookies: cookies });
        }
      });
    } catch (e) {
      sendResponse({ error: e.message });
    }
    return true; // 异步响应需要返回true
  }

  if (request.action === "setCookie") {
    try {
      const cookie = request.cookie;
      const cookieParams = {
        url: request.url,
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
      chrome.cookies.remove(
        {
          url: request.url,
          name: cookie.name,
        },
        () => {
          // 忽略删除结果，无论成功失败都继续设置新cookie
          console.log(`准备设置cookie: ${cookie.name}`);

          // 添加小延迟确保删除操作完成
          setTimeout(() => {
            chrome.cookies.set(cookieParams, (result) => {
              if (chrome.runtime.lastError) {
                console.error(
                  `设置cookie失败: ${chrome.runtime.lastError.message}`
                );
                sendResponse({ error: chrome.runtime.lastError.message });
              } else if (!result) {
                console.error(`设置cookie ${cookie.name} 失败: 返回结果为空`);
                sendResponse({ error: "设置cookie失败，无返回结果" });
              } else {
                console.log(`成功设置cookie: ${cookie.name}`, result);
                sendResponse({ success: true, result: result });
              }
            });
          }, 100);
        }
      );
    } catch (e) {
      console.error(`设置cookie出错: ${e.message}`, e);
      sendResponse({ error: e.message });
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

      // 不要包含domain和path参数，chrome.cookies.remove不支持这些参数
      console.log(
        `尝试删除cookie: ${cookie.name}`,
        JSON.stringify(removeParams)
      );

      chrome.cookies.remove(removeParams, (result) => {
        if (chrome.runtime.lastError) {
          console.error(`删除cookie失败: ${chrome.runtime.lastError.message}`);

          // 如果是因为无法找到cookie导致的错误，提供更具体的信息
          if (chrome.runtime.lastError.message.includes("No cookie found")) {
            console.log(
              `没有找到匹配的cookie: ${cookie.name}, 匹配参数:`,
              JSON.stringify(removeParams)
            );
          }

          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          if (result) {
            console.log(`成功删除cookie: ${cookie.name}, 结果:`, result);
            sendResponse({ success: true });
          } else {
            // 某些情况下result可能为null，但这并不一定意味着失败
            console.log(`删除cookie ${cookie.name} 返回空结果，可能已不存在`);
            sendResponse({ success: true, warning: "返回结果为空" });
          }
        }
      });
    } catch (e) {
      console.error(`删除cookie出错: ${e.message}`, e);
      sendResponse({ error: e.message });
    }
    return true;
  }
});
