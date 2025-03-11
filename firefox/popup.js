// 初始化变量
let currentTab = null;
let exportFormat = "cookie-editor";
let importFormat = "auto";
let currentProfilesCache = {};
let contentScriptReady = false;

// 获取当前主机名
function getCurrentHostname() {
  return new URL(currentTab.url).hostname;
}

// 获取配置的存储键
function getProfileStorageKey() {
  return `profile_${getCurrentHostname()}`;
}

// 更新UI的主机名显示
function updateHostnameDisplay() {
  document.getElementById("current-hostname").textContent =
    getCurrentHostname();
  document.getElementById("profiles-hostname").textContent =
    getCurrentHostname();
}

// 确保content script已加载
async function ensureContentScriptLoaded() {
  try {
    // 向background发送消息，请求确保content script已加载
    const response = await browser.runtime.sendMessage({
      action: "ensureContentScriptLoaded",
    });
    if (response && response.success) {
      contentScriptReady = true;
      return true;
    } else {
      console.error("content script未能成功加载");
      return false;
    }
  } catch (error) {
    console.error("检查content script状态失败:", error);
    return false;
  }
}

// 初始化标签页
function initTabs() {
  try {
    console.log("初始化标签...");
    const tabs = document.querySelectorAll(".cookie-manager-tab");
    const tabContents = document.querySelectorAll(
      ".cookie-manager-tab-content"
    );

    console.log(`找到${tabs.length}个标签和${tabContents.length}个内容区域`);

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        console.log(`点击标签: ${tab.dataset.tab}`);

        // 移除所有活动标签的cookie-manager-active类
        tabs.forEach((t) => t.classList.remove("cookie-manager-active"));
        tabContents.forEach((c) => c.classList.remove("cookie-manager-active"));

        // 添加当前标签的cookie-manager-active类
        tab.classList.add("cookie-manager-active");

        // 查找对应的内容区域并激活
        const tabId = `${tab.dataset.tab}-tab`;
        const content = document.getElementById(tabId);

        if (content) {
          console.log(`激活内容区域: ${tabId}`);
          content.classList.add("cookie-manager-active");
        } else {
          console.error(`找不到内容区域: ${tabId}`);
        }
      });
    });

    console.log("标签初始化完成");
  } catch (error) {
    console.error("初始化标签时出错:", error);
  }
}

// 显示通知
function showNotification(message, type = "info") {
  try {
    console.log(`显示通知: ${message}, 类型: ${type}`);

    const notification = document.getElementById("notification");
    if (!notification) {
      console.error("找不到通知元素");
      return;
    }

    // 设置通知内容和类型
    notification.textContent = message;
    notification.className = `${type} show`;

    // 自动消失
    setTimeout(() => {
      notification.className = "";
    }, 3000);
  } catch (error) {
    console.error("显示通知时出错:", error);
  }
}

// 获取所有Cookie和存储数据
async function getAllData() {
  return new Promise(async (resolve, reject) => {
    try {
      // 确保content script已加载
      if (!contentScriptReady) {
        const ready = await ensureContentScriptLoaded();
        if (!ready) {
          reject("无法加载内容脚本，请尝试刷新页面");
          return;
        }
      }

      // 发送消息给content script获取数据
      try {
        const response = await browser.tabs.sendMessage(currentTab.id, {
          action: "getAllData",
        });

        if (!response) {
          reject("内容脚本未响应，请刷新页面后重试");
          return;
        }

        resolve(response);
      } catch (error) {
        reject(`获取数据失败: ${error.message || error}`);
      }
    } catch (error) {
      reject(`获取数据失败: ${error.message || error}`);
    }
  });
}

// 设置所有Cookie和存储数据
async function setAllData(data) {
  return new Promise(async (resolve, reject) => {
    try {
      // 检查当前页面是否是file://协议
      if (
        currentTab &&
        currentTab.url &&
        currentTab.url.startsWith("file://")
      ) {
        console.warn("当前页面使用file://协议，无法完全设置cookie数据");
      }

      // 确保content script已加载
      if (!contentScriptReady) {
        const ready = await ensureContentScriptLoaded();
        if (!ready) {
          reject("无法加载内容脚本，请尝试刷新页面");
          return;
        }
      }

      // 发送消息给content script设置数据
      try {
        const response = await browser.tabs.sendMessage(currentTab.id, {
          action: "setAllData",
          data: data,
        });

        if (!response) {
          reject("内容脚本未响应，请刷新页面后重试");
          return;
        }

        console.log("设置数据结果:", response);

        // 检查结果中的cookie设置情况
        if (
          response.cookies &&
          response.cookies.some((c) => !c.success && c.isFileProtocol)
        ) {
          // 有cookie因为file://协议而设置失败
          console.warn("部分cookie因为file://协议限制未能设置");
          resolve({
            success: true,
            warning:
              "在本地文件页面上，cookie设置无法生效。其他数据已正常设置。",
            result: response,
          });
        } else {
          resolve({
            success: true,
            result: response,
          });
        }
      } catch (error) {
        console.error("设置数据时出错:", error);
        reject(`设置数据失败: ${error.message || error}`);
      }
    } catch (error) {
      console.error("设置数据处理失败:", error);
      reject(`设置数据处理失败: ${error.message || error}`);
    }
  });
}

// 清除所有数据
async function clearAllData() {
  return new Promise(async (resolve, reject) => {
    try {
      // 确保content script已加载
      if (!contentScriptReady) {
        const ready = await ensureContentScriptLoaded();
        if (!ready) {
          reject("无法加载内容脚本，请尝试刷新页面");
          return;
        }
      }

      console.log("开始清除所有数据");

      // 发送消息给content script清除数据
      try {
        const response = await browser.tabs.sendMessage(currentTab.id, {
          action: "clearAllData",
        });

        if (!response) {
          console.error("内容脚本未响应，请刷新页面后重试");
          reject("内容脚本未响应，请刷新页面后重试");
          return;
        }

        if (response.error) {
          console.error(`清除数据返回错误: ${response.error}`);
          reject(`清除数据失败: ${response.error}`);
          return;
        }

        // 处理带有警告的成功情况
        if (response.warning) {
          console.warn(`清除数据警告: ${response.warning}`);
        }

        // 如果有结果数据，检查是否有cookie删除失败
        if (response.results) {
          const failedCookies = response.results.filter((r) => !r.success);
          if (failedCookies.length > 0) {
            console.warn(`有 ${failedCookies.length} 个cookie删除失败`);
            console.warn("失败的cookie详情:", JSON.stringify(failedCookies));
          }
        }

        console.log("数据清除完成，返回:", JSON.stringify(response));
        resolve(response);
      } catch (error) {
        console.error(`清除数据过程中出现异常: ${error.message || error}`);
        reject(`清除数据失败: ${error.message || error}`);
      }
    } catch (error) {
      console.error(`清除数据过程中出现异常: ${error.message || error}`);
      reject(`清除数据失败: ${error.message || error}`);
    }
  });
}

// 重置导出格式下拉框和全局变量
function resetExportFormat(format = null) {
  const exportFormatSelect = document.getElementById("export-format");

  // 如果没有指定格式，使用下拉框当前值
  if (!format) {
    exportFormat = exportFormatSelect.value;
  } else {
    // 设置下拉框和全局变量为指定格式
    exportFormatSelect.value = format;
    exportFormat = format;
  }

  console.log("导出格式已设置为:", exportFormat);
}

// 导出数据
async function exportData() {
  try {
    // 更新导出格式全局变量
    resetExportFormat();

    // 获取数据
    const data = await getAllData();

    let exportedData = "";

    // 根据选择的格式进行转换
    if (exportFormat === "json") {
      exportedData = JSON.stringify(data, null, 2);
    } else if (exportFormat === "base64") {
      exportedData = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    } else if (exportFormat === "cookie-editor") {
      // 确保只导出cookies数组，不包含storage
      if (Array.isArray(data.cookies)) {
        exportedData = JSON.stringify(data.cookies, null, 2);
      } else {
        exportedData = "[]";
        console.warn("导出的cookie数据格式不正确，返回空数组");
      }
    }

    // 显示导出数据
    document.getElementById("export-data").value = exportedData;
    showNotification("数据导出成功", "success");
  } catch (error) {
    showNotification(`导出失败: ${error}`, "error");
    document.getElementById("export-data").value = "";
  }
}

// 重置导入格式下拉框和全局变量
function resetImportFormat(format = null) {
  const importFormatSelect = document.getElementById("import-format");

  // 如果没有指定格式，使用下拉框当前值
  if (!format) {
    importFormat = importFormatSelect.value;
  } else {
    // 设置下拉框和全局变量为指定格式
    importFormatSelect.value = format;
    importFormat = format;
  }

  console.log("导入格式已设置为:", importFormat);
}

// 导入数据
async function importData() {
  try {
    // 更新导入格式全局变量
    resetImportFormat();

    const importData = document.getElementById("import-data").value.trim();

    if (!importData) {
      showNotification("请输入要导入的数据", "error");
      return;
    }

    console.log(`开始导入数据，格式: ${importFormat}`);
    let data;

    // 尝试解析数据
    try {
      if (importFormat === "auto") {
        // 尝试作为Base64解码
        try {
          // 增加对Unicode字符的支持
          const decoded = decodeURIComponent(escape(atob(importData)));
          data = JSON.parse(decoded);

          if (Array.isArray(data)) {
            // 这是Cookie Editor格式
            console.log("检测到Base64编码的Cookie Editor格式数组");
            await importCookieEditorFormat(data);
            return;
          } else if (data.cookies || data.storage) {
            // 这是完整格式
            console.log("检测到Base64编码的完整格式");
            await importFullFormat(data);
            return;
          }
        } catch (e) {
          // 不是有效的Base64，继续尝试其他格式
          console.log("不是有效的Base64格式，尝试其他格式", e);
        }

        // 尝试作为JSON解析
        data = JSON.parse(importData);

        // 判断是Cookie Editor格式还是完整格式
        if (Array.isArray(data)) {
          console.log("检测到Cookie Editor格式数组，长度:", data.length);
          await importCookieEditorFormat(data);
        } else if (data.cookies || data.storage) {
          console.log("检测到完整格式数据");
          await importFullFormat(data);
        } else {
          throw new Error("无法识别的数据格式");
        }
      } else if (importFormat === "base64") {
        // 增加对Unicode字符的支持
        const decoded = decodeURIComponent(escape(atob(importData)));
        data = JSON.parse(decoded);

        if (Array.isArray(data)) {
          // Base64编码的Cookie Editor格式
          await importCookieEditorFormat(data);
        } else {
          // 假设是完整格式
          await importFullFormat(data);
        }
      } else if (importFormat === "cookie-editor") {
        data = JSON.parse(importData);
        if (!Array.isArray(data)) {
          console.error("cookie-editor格式的数据不是数组:", data);
          throw new Error("Cookie-Editor格式应该是cookie对象数组");
        }
        console.log("导入Cookie Editor格式数组，长度:", data.length);
        await importCookieEditorFormat(data);
      } else if (importFormat === "json") {
        data = JSON.parse(importData);
        if (Array.isArray(data)) {
          // JSON格式的Cookie Editor数组
          await importCookieEditorFormat(data);
        } else {
          // 完整格式
          await importFullFormat(data);
        }
      }

      showNotification("数据导入成功，页面即将刷新", "success");
    } catch (error) {
      console.error("导入数据解析失败:", error);
      throw new Error(`解析数据失败: ${error.message}`);
    }
  } catch (error) {
    showNotification(`导入失败: ${error.message}`, "error");
  }
}

// 导入Cookie Editor格式的数据
async function importCookieEditorFormat(cookies) {
  if (!Array.isArray(cookies)) {
    console.error("导入的Cookie Editor数据不是数组格式:", cookies);
    throw new Error("无效的Cookie Editor格式，预期是cookie对象数组");
  }

  try {
    console.log("开始导入Cookie Editor格式数据...");
    console.log("导入的cookie数量:", cookies.length);

    // 检查cookies数组中的对象结构，确保它们有必要的字段
    const validCookies = cookies.filter((cookie) => {
      const hasRequiredFields =
        cookie && typeof cookie === "object" && cookie.name && cookie.value;
      if (!hasRequiredFields) {
        console.warn("跳过无效的cookie对象:", cookie);
      }
      return hasRequiredFields;
    });

    if (validCookies.length === 0) {
      console.warn("没有有效的cookie对象可以导入");
      throw new Error("没有找到有效的cookie数据");
    }

    if (validCookies.length < cookies.length) {
      console.warn(
        `过滤掉了 ${cookies.length - validCookies.length} 个无效的cookie对象`
      );
    }

    // 先清空当前数据并等待完成
    console.log("清除当前数据...");
    const clearResult = await clearAllData();

    // 检查清除结果
    if (clearResult.warning) {
      console.warn(`导入过程中的警告: ${clearResult.warning}`);
    }

    console.log("清除完成，开始设置新数据...");

    // 设置数据前小延迟，确保所有清除操作都完成
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 设置数据 - 只提供cookies，不包含storage
    await setAllData({
      cookies: validCookies,
      storage: { localStorage: {}, sessionStorage: {} }, // 提供空的storage对象
    });

    console.log("Cookie Editor格式数据导入成功");

    // 刷新页面
    refreshPage();
  } catch (error) {
    console.error(`导入失败: ${error.message || error}`);
    throw new Error(`导入失败: ${error.message || error}`);
  }
}

// 导入完整格式的数据
async function importFullFormat(data) {
  if (!data || (!data.cookies && !data.storage)) {
    throw new Error("无效的数据格式");
  }

  try {
    console.log("开始导入完整格式数据...");

    // 先清空当前数据并等待完成
    console.log("清除当前数据...");
    const clearResult = await clearAllData();

    // 检查清除结果
    if (clearResult.warning) {
      console.warn(`导入过程中的警告: ${clearResult.warning}`);
    }

    console.log("清除完成，开始设置新数据...");

    // 设置数据前小延迟，确保所有清除操作都完成
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 设置数据
    await setAllData({
      cookies: data.cookies || [],
      storage: data.storage || { localStorage: {}, sessionStorage: {} },
    });

    console.log("完整格式数据导入成功");

    // 刷新页面
    refreshPage();
  } catch (error) {
    console.error(`导入失败: ${error.message || error}`);
    throw new Error(`导入失败: ${error.message || error}`);
  }
}

// 复制到剪贴板
function copyToClipboard() {
  const exportData = document.getElementById("export-data");
  exportData.select();
  document.execCommand("copy");
  showNotification("已复制到剪贴板", "success");
}

// 页面刷新函数
function refreshPage(delay = 1000) {
  // 延迟指定时间后刷新页面
  setTimeout(() => {
    browser.tabs.reload();
  }, delay);
}

// 应用配置
async function applyProfile(name, profile) {
  try {
    console.log(`开始应用配置: "${name}"`);

    // 检查当前页面是否是file://协议
    if (currentTab && currentTab.url && currentTab.url.startsWith("file://")) {
      console.warn(`在file://协议页面应用配置"${name}"，cookie设置可能不生效`);
    }

    // 先清空当前数据并等待完成
    console.log("清除当前数据...");
    const clearResult = await clearAllData();

    // 检查清除结果
    if (clearResult.warning) {
      console.warn(`应用配置过程中的警告: ${clearResult.warning}`);
    }

    console.log("清除完成，开始设置新数据...");

    // 设置数据前小延迟，确保所有清除操作都完成
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 设置数据
    const setResult = await setAllData({
      cookies: profile.cookies || [],
      storage: profile.storage || { localStorage: {}, sessionStorage: {} },
    });

    // 检查设置结果
    let successMessage = `配置 "${name}" 已应用，页面即将刷新`;
    let notificationType = "success";

    if (setResult.warning) {
      console.warn(`应用配置过程中的警告: ${setResult.warning}`);
      // 如果有文件协议限制的警告，修改成功信息
      if (setResult.warning.includes("本地文件页面")) {
        successMessage = `配置 "${name}" 已部分应用（cookie设置受限于本地文件页面）`;
        notificationType = "warning";
      }
    }

    console.log(`配置 "${name}" 应用流程完成`);
    showNotification(successMessage, notificationType);

    // 刷新页面
    refreshPage();
  } catch (error) {
    console.error(`应用配置 "${name}" 失败:`, error);
    showNotification(`应用配置失败: ${error.message || error}`, "error");
    throw error;
  }
}

// 加载配置列表
function loadProfiles() {
  browser.storage.local.get(null).then((result) => {
    const profilesList = document.getElementById("profiles-list");
    profilesList.innerHTML = "";

    // 过滤出当前域名的配置
    const profiles = {};
    const profileKeyPrefix = getProfileStorageKey();

    // 缓存所有配置
    currentProfilesCache = {};

    for (const key in result) {
      if (key.startsWith("profile_")) {
        const hostname = key.replace("profile_", "");
        const data = result[key];

        if (!profiles[hostname]) {
          profiles[hostname] = {};
        }

        // 添加到当前域名的配置
        for (const profileName in data) {
          if (hostname === getCurrentHostname()) {
            currentProfilesCache[profileName] = data[profileName];
          }
          profiles[hostname][profileName] = data[profileName];
        }
      }
    }

    // 显示当前域名的配置
    const wrapper = document.createElement("div");
    wrapper.className = "cookie-manager-profiles-wrapper";

    if (
      !profiles[getCurrentHostname()] ||
      Object.keys(profiles[getCurrentHostname()]).length === 0
    ) {
      wrapper.innerHTML =
        '<div class="cookie-manager-no-profiles">当前域名没有保存的配置</div>';
      profilesList.appendChild(wrapper);
      return;
    }

    // 对配置按日期排序
    const sortedProfiles = Object.entries(profiles[getCurrentHostname()]).sort(
      (a, b) => new Date(b[1].date) - new Date(a[1].date)
    );

    sortedProfiles.forEach(([profileName, profile]) => {
      // 创建配置项元素
      const profileItem = document.createElement("div");
      profileItem.className = "cookie-manager-profile";
      profileItem.innerHTML = createProfileItemHTML(profileName, profile.date);

      // 应用配置按钮
      profileItem
        .querySelector(".cookie-manager-btn-apply")
        .addEventListener("click", () => {
          applyProfile(profileName, profile);
        });

      // 导出配置按钮
      profileItem
        .querySelector(".cookie-manager-btn-export")
        .addEventListener("click", () => {
          exportProfile(profileName, profile);
        });

      // 重命名配置按钮
      profileItem
        .querySelector(".cookie-manager-btn-rename")
        .addEventListener("click", () => {
          renameProfile(profileName);
        });

      // 删除配置按钮
      profileItem
        .querySelector(".cookie-manager-btn-delete")
        .addEventListener("click", () => {
          deleteProfile(profileName);
        });

      wrapper.appendChild(profileItem);
    });

    profilesList.appendChild(wrapper);
  });
}

// 创建配置项HTML
function createProfileItemHTML(profileName, date) {
  const dateStr = new Date(date).toLocaleString();
  return `
    <div class="cookie-manager-profile-info">
      <div style="font-weight:bold;">${profileName}</div>
      <div style="font-size:11px;color:#666;">${dateStr}</div>
    </div>
    <div class="cookie-manager-profile-actions">
      <button class="cookie-manager-btn cookie-manager-btn-apply">应用</button>
      <button class="cookie-manager-btn cookie-manager-btn-export">导出</button>
      <button class="cookie-manager-btn cookie-manager-btn-rename">重命名</button>
      <button class="cookie-manager-btn cookie-manager-btn-delete">删除</button>
    </div>
  `;
}

// 初始化事件
function initEvents() {
  try {
    console.log("开始初始化事件...");

    // 导出标签页的事件
    const btnExport = document.getElementById("btn-export");
    if (btnExport) {
      btnExport.addEventListener("click", exportData);
      console.log("导出按钮事件已绑定");
    } else {
      console.error("找不到导出按钮元素");
    }

    const exportFormatSelect = document.getElementById("export-format");
    if (exportFormatSelect) {
      exportFormatSelect.addEventListener("change", (e) => {
        exportFormat = e.target.value;
        // 在切换格式时自动导出数据
        exportData();
        console.log("导出格式已更改为:", exportFormat);
      });
      console.log("导出格式选择器事件已绑定");
    } else {
      console.error("找不到导出格式选择器元素");
    }

    const btnCopy = document.getElementById("btn-copy");
    if (btnCopy) {
      btnCopy.addEventListener("click", copyToClipboard);
      console.log("复制按钮事件已绑定");
    } else {
      console.error("找不到复制按钮元素");
    }

    // 导入标签页的事件
    const btnImport = document.getElementById("btn-import");
    if (btnImport) {
      btnImport.addEventListener("click", importData);
      console.log("导入按钮事件已绑定");
    } else {
      console.error("找不到导入按钮元素");
    }

    const importFormatSelect = document.getElementById("import-format");
    if (importFormatSelect) {
      importFormatSelect.addEventListener("change", (e) => {
        importFormat = e.target.value;
        console.log("导入格式已更改为:", importFormat);
      });
      console.log("导入格式选择器事件已绑定");
    } else {
      console.error("找不到导入格式选择器元素");
    }

    const btnImportProfile = document.getElementById("btn-import-profile");
    if (btnImportProfile) {
      btnImportProfile.addEventListener("click", importAsProfile);
      console.log("导入为配置按钮事件已绑定");
    } else {
      console.error("找不到导入为配置按钮元素");
    }

    // 配置标签页的事件
    const btnCreateProfile = document.getElementById("btn-create-profile");
    if (btnCreateProfile) {
      btnCreateProfile.addEventListener("click", createProfile);
      console.log("创建配置按钮事件已绑定");
    } else {
      console.error("找不到创建配置按钮元素");
    }

    const profileSearch = document.getElementById("profile-search");
    if (profileSearch) {
      profileSearch.addEventListener("input", (e) => {
        searchProfiles(e.target.value);
      });
      console.log("配置搜索框事件已绑定");
    } else {
      console.error("找不到配置搜索框元素");
    }

    // 导出数据
    exportData();

    console.log("事件初始化完成");
  } catch (error) {
    console.error("初始化事件时出错:", error);
  }
}

// 初始化
document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("页面加载完成，开始初始化...");

    // 初始化UI
    initTabs();

    // 获取当前标签页
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    currentTab = tabs[0];

    // 更新主机名显示
    updateHostnameDisplay();

    // 确保content script已加载
    await ensureContentScriptLoaded();

    // 加载配置列表
    loadProfiles();

    // 初始化事件
    initEvents();

    // 使用更长的延迟确保DOM元素完全加载
    setTimeout(() => {
      try {
        // 验证DOM元素是否存在
        const exportFormatElem = document.getElementById("export-format");
        const importFormatElem = document.getElementById("import-format");

        if (!exportFormatElem) {
          console.error("找不到导出格式下拉框元素");
        } else {
          resetExportFormat();
          console.log("导出格式已初始化为:", exportFormat);
        }

        if (!importFormatElem) {
          console.error("找不到导入格式下拉框元素");
        } else {
          resetImportFormat();
          console.log("导入格式已初始化为:", importFormat);
        }

        console.log("格式设置初始化完成");
      } catch (formatError) {
        console.error("初始化格式设置时出错:", formatError);
      }
    }, 300); // 延长延迟时间到300ms

    console.log("扩展初始化流程已完成");
  } catch (error) {
    console.error("初始化失败:", error);
    try {
      const notification = document.getElementById("notification");
      if (notification) {
        notification.textContent = "初始化失败: " + error.message;
        notification.className = "error show";
        setTimeout(() => {
          notification.className = "";
        }, 3000);
      } else {
        console.error("找不到通知元素");
      }
    } catch (notifyError) {
      console.error("显示通知出错:", notifyError);
    }
  }
});

// 创建配置
async function createProfile() {
  try {
    // 获取配置名称
    const profileNameInput = document.getElementById("profile-name");
    const profileName = profileNameInput.value.trim();

    if (!profileName) {
      showNotification("请输入配置名称", "error");
      return;
    }

    // 获取当前数据
    const data = await getAllData();

    // 保存配置
    saveProfileData(profileName, data.cookies, data.storage);

    // 清空输入框
    profileNameInput.value = "";
  } catch (error) {
    showNotification(`创建配置失败: ${error}`, "error");
  }
}

// 删除配置
function deleteProfile(name) {
  if (!confirm(`确定要删除配置 "${name}" 吗？`)) {
    return;
  }

  const profileKey = getProfileStorageKey();

  browser.storage.local.get(profileKey).then((result) => {
    const profiles = result[profileKey] || {};

    if (profiles[name]) {
      delete profiles[name];

      // 更新存储
      const updateData = {};
      updateData[profileKey] = profiles;

      browser.storage.local.set(updateData).then(() => {
        // 更新配置列表
        loadProfiles();
        showNotification(`配置 "${name}" 已删除`, "success");
      });
    }
  });
}

// 重命名配置
function renameProfile(oldName) {
  const newName = prompt(`请输入新的配置名称（当前名称：${oldName}）`, oldName);

  if (!newName || newName === oldName) {
    return; // 用户取消或名称未变更
  }

  const profileKey = getProfileStorageKey();

  browser.storage.local.get(profileKey).then((result) => {
    const profiles = result[profileKey] || {};

    // 检查新名称是否已存在
    if (profiles[newName] && !confirm(`配置"${newName}"已存在，是否覆盖？`)) {
      return;
    }

    // 如果旧名称存在，进行重命名
    if (profiles[oldName]) {
      // 复制数据到新名称
      profiles[newName] = profiles[oldName];
      // 删除旧名称
      delete profiles[oldName];

      // 更新存储
      const updateData = {};
      updateData[profileKey] = profiles;

      browser.storage.local.set(updateData).then(() => {
        // 更新配置列表
        loadProfiles();
        showNotification(`配置已重命名为 "${newName}"`, "success");
      });
    }
  });
}

// 导出配置
function exportProfile(name, profile) {
  console.log("导出配置:", name, "配置数据:", profile);

  // 切换到导出标签
  document.querySelector(".cookie-manager-tab[data-tab='export']").click();

  // 强制设置为JSON格式（完整格式）
  resetExportFormat("json");

  // 设置导出数据 - 使用完整格式
  document.getElementById("export-data").value = JSON.stringify(
    profile,
    null,
    2
  );

  showNotification(`配置 "${name}" 已导出`, "success");
}

// 导入为配置
async function importAsProfile() {
  try {
    console.log("开始导入为配置...");
    const importDataElem = document.getElementById("import-data");

    if (!importDataElem) {
      console.error("找不到导入数据文本框元素");
      showNotification("找不到导入数据文本框", "error");
      return;
    }

    const importData = importDataElem.value.trim();

    if (!importData) {
      console.warn("导入数据为空");
      showNotification("请输入要导入的数据", "error");
      return;
    }

    console.log(`尝试解析导入数据，格式: ${importFormat}`);
    let data;

    // 尝试解析数据
    try {
      if (importFormat === "auto") {
        console.log("使用自动检测格式");
        // 尝试作为Base64解码
        try {
          // 增加对Unicode字符的支持
          const decoded = decodeURIComponent(escape(atob(importData)));
          data = JSON.parse(decoded);
          console.log("成功解析为Base64格式");

          if (data.cookies || data.storage) {
            // 完整格式
            console.log("检测到完整格式数据");
          } else if (Array.isArray(data)) {
            // 可能是cookie-editor格式
            console.log("检测到Cookie-Editor格式数据");
            data = {
              cookies: data,
              storage: { localStorage: {}, sessionStorage: {} },
            };
          } else {
            throw new Error("无法识别的数据格式");
          }
        } catch (base64Error) {
          console.log("Base64解析失败，尝试JSON格式", base64Error);

          // 尝试作为JSON解析
          try {
            data = JSON.parse(importData);
            console.log("成功解析为JSON格式");

            if (data.cookies || data.storage) {
              // 完整格式
              console.log("检测到完整格式数据");
            } else if (Array.isArray(data)) {
              // 可能是cookie-editor格式
              console.log("检测到Cookie-Editor格式数据");
              data = {
                cookies: data,
                storage: { localStorage: {}, sessionStorage: {} },
              };
            } else {
              throw new Error("无法识别的数据格式");
            }
          } catch (jsonError) {
            console.error("JSON解析失败", jsonError);
            throw new Error("无法解析数据，请检查格式");
          }
        }
      } else if (importFormat === "base64") {
        // Base64格式
        console.log("使用Base64格式解析");
        const decoded = decodeURIComponent(escape(atob(importData)));
        data = JSON.parse(decoded);
      } else if (importFormat === "json") {
        // JSON格式
        console.log("使用JSON格式解析");
        data = JSON.parse(importData);
      } else if (importFormat === "cookie-editor") {
        // Cookie-Editor格式
        console.log("使用Cookie-Editor格式解析");
        const cookies = JSON.parse(importData);
        if (!Array.isArray(cookies)) {
          throw new Error("Cookie-Editor格式应为数组");
        }
        data = {
          cookies: cookies,
          storage: { localStorage: {}, sessionStorage: {} },
        };
      }
    } catch (parseError) {
      console.error("解析数据失败:", parseError);
      showNotification(`解析数据失败: ${parseError.message}`, "error");
      return;
    }

    // 验证数据
    if (!data || (!data.cookies && !data.storage)) {
      console.error("无效的数据格式");
      showNotification("无效的数据格式", "error");
      return;
    }

    // 获取配置名称
    const profileName = prompt("请输入配置名称:");
    if (!profileName || profileName.trim() === "") {
      console.warn("用户取消或未输入配置名称");
      return;
    }

    console.log(`创建新配置: "${profileName}"`);

    // 保存配置
    await saveProfileData(
      profileName.trim(),
      data.cookies || [],
      data.storage || { localStorage: {}, sessionStorage: {} }
    );

    // 重新加载配置列表
    loadProfiles();

    showNotification(`配置 "${profileName}" 已创建`, "success");
    console.log("导入为配置完成");
  } catch (error) {
    console.error("导入为配置失败:", error);
    showNotification(`导入为配置失败: ${error.message}`, "error");
  }
}

// 搜索配置
function searchProfiles(query) {
  if (!query) {
    loadProfiles();
    return;
  }

  const profilesList = document.getElementById("profiles-list");
  const wrapper = document.createElement("div");
  wrapper.className = "cookie-manager-profiles-wrapper";

  // 没有配置的情况
  if (!currentProfilesCache || Object.keys(currentProfilesCache).length === 0) {
    wrapper.innerHTML =
      '<div class="cookie-manager-no-profiles">当前域名没有保存的配置</div>';
    profilesList.innerHTML = "";
    profilesList.appendChild(wrapper);
    return;
  }

  // 转义正则表达式特殊字符
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  // 创建搜索正则表达式
  const regex = new RegExp(escapeRegExp(query), "i");

  // 过滤匹配的配置
  const matchedProfiles = Object.entries(currentProfilesCache).filter(
    ([name, profile]) => regex.test(name)
  );

  if (matchedProfiles.length === 0) {
    wrapper.innerHTML =
      '<div class="cookie-manager-no-profiles">没有找到匹配的配置</div>';
  } else {
    // 对匹配的配置按日期排序
    matchedProfiles.sort((a, b) => new Date(b[1].date) - new Date(a[1].date));

    matchedProfiles.forEach(([profileName, profile]) => {
      // 创建配置项元素
      const profileItem = document.createElement("div");
      profileItem.className = "cookie-manager-profile";
      profileItem.innerHTML = createProfileItemHTML(profileName, profile.date);

      // 应用配置按钮
      profileItem
        .querySelector(".cookie-manager-btn-apply")
        .addEventListener("click", () => {
          applyProfile(profileName, profile);
        });

      // 导出配置按钮
      profileItem
        .querySelector(".cookie-manager-btn-export")
        .addEventListener("click", () => {
          exportProfile(profileName, profile);
        });

      // 重命名配置按钮
      profileItem
        .querySelector(".cookie-manager-btn-rename")
        .addEventListener("click", () => {
          renameProfile(profileName);
        });

      // 删除配置按钮
      profileItem
        .querySelector(".cookie-manager-btn-delete")
        .addEventListener("click", () => {
          deleteProfile(profileName);
        });

      wrapper.appendChild(profileItem);
    });
  }

  profilesList.innerHTML = "";
  profilesList.appendChild(wrapper);
}

// 保存配置数据
function saveProfileData(profileName, cookies, storage) {
  const profileKey = getProfileStorageKey();

  browser.storage.local.get(profileKey).then((result) => {
    const profiles = result[profileKey] || {};

    // 检查重名
    if (
      profiles[profileName] &&
      !confirm(`配置"${profileName}"已存在，是否覆盖？`)
    ) {
      return;
    }

    // 添加/更新配置
    profiles[profileName] = {
      date: new Date().toISOString(),
      cookies: cookies || [],
      storage: storage || { localStorage: {}, sessionStorage: {} },
    };

    // 更新存储
    const updateData = {};
    updateData[profileKey] = profiles;

    browser.storage.local.set(updateData).then(() => {
      // 更新配置列表
      loadProfiles();

      // 切换到配置管理标签
      document
        .querySelector('.cookie-manager-tab[data-tab="profiles"]')
        .click();

      showNotification(`配置"${profileName}"保存成功`, "success");
    });
  });
}
