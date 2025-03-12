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
  return new Promise((resolve) => {
    // 向background发送消息，请求确保content script已加载
    chrome.runtime.sendMessage(
      { action: "ensureContentScriptLoaded" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "检查content script状态失败:",
            chrome.runtime.lastError
          );
          resolve(false);
        } else if (response && response.success) {
          contentScriptReady = true;
          resolve(true);
        } else {
          console.error("content script未能成功加载");
          resolve(false);
        }
      }
    );
  });
}

// 初始化标签页点击事件
function initTabs() {
  const tabs = document.querySelectorAll(".cookie-manager-tab");
  const tabContents = document.querySelectorAll(".cookie-manager-tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.getAttribute("data-tab");

      // 移除所有活动标签
      tabs.forEach((t) => t.classList.remove("cookie-manager-active"));
      tabContents.forEach((content) =>
        content.classList.remove("cookie-manager-active")
      );

      // 激活所选标签
      tab.classList.add("cookie-manager-active");
      document
        .getElementById(`${tabName}-tab`)
        .classList.add("cookie-manager-active");

      // 如果是配置标签，加载配置
      if (tabName === "profiles") {
        loadProfiles();
      }
    });
  });
}

// 显示通知
function showNotification(message, type = "info") {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.className = ""; // 清除类

  // 添加新的类
  notification.classList.add("show");
  notification.classList.add(type);

  // 定时关闭通知
  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}

// 获取所有Cookie和存储数据
async function getAllData() {
  return new Promise(async (resolve, reject) => {
    try {
      // 先查询当前活动标签页
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs.length === 0) {
          reject("没有找到活动标签页");
          return;
        }

        currentTab = tabs[0];
        updateHostnameDisplay();

        // 确保content script已加载
        if (!contentScriptReady) {
          const ready = await ensureContentScriptLoaded();
          if (!ready) {
            reject("无法加载内容脚本，请尝试刷新页面");
            return;
          }
        }

        // 发送消息给content script获取数据
        chrome.tabs.sendMessage(
          currentTab.id,
          { action: "getAllData" },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(`获取数据失败: ${chrome.runtime.lastError.message}`);
              return;
            }

            if (!response) {
              reject("内容脚本未响应，请刷新页面后重试");
              return;
            }

            if (response.error) {
              reject(`获取数据失败: ${response.error}`);
              return;
            }

            resolve(response);
          }
        );
      });
    } catch (error) {
      reject(`获取数据失败: ${error.message || error}`);
    }
  });
}

// 设置所有Cookie和存储数据
async function setAllData(data) {
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

      // 发送消息给content script设置数据
      chrome.tabs.sendMessage(
        currentTab.id,
        {
          action: "setAllData",
          data: data,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(`设置数据失败: ${chrome.runtime.lastError.message}`);
            return;
          }

          if (!response) {
            reject("内容脚本未响应，请刷新页面后重试");
            return;
          }

          if (response.error) {
            reject(`设置数据失败: ${response.error}`);
            return;
          }

          resolve(response);
        }
      );
    } catch (error) {
      reject(`设置数据失败: ${error.message || error}`);
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
      chrome.tabs.sendMessage(
        currentTab.id,
        {
          action: "clearAllData",
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              `清除数据失败 (runtime error): ${chrome.runtime.lastError.message}`
            );
            reject(`清除数据失败: ${chrome.runtime.lastError.message}`);
            return;
          }

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
        }
      );
    } catch (error) {
      console.error(`清除数据过程中出现异常: ${error.message || error}`);
      reject(`清除数据失败: ${error.message || error}`);
    }
  });
}

// 导出数据
async function exportData() {
  try {
    // 获取所有数据
    const data = await getAllData();

    // 根据选择的格式处理数据
    let exportedData = "";

    switch (exportFormat) {
      case "cookie-editor":
        exportedData = JSON.stringify(data.cookies, null, 2);
        break;
      case "json":
        exportedData = JSON.stringify(
          {
            cookies: data.cookies,
            storage: data.storage,
          },
          null,
          2
        );
        break;
      case "base64":
        // 修复Unicode字符编码问题
        const jsonString = JSON.stringify({
          cookies: data.cookies,
          storage: data.storage,
        });
        // 先将Unicode字符转换为UTF-8编码，然后再进行Base64编码
        exportedData = btoa(unescape(encodeURIComponent(jsonString)));
        break;
    }

    // 显示导出数据
    document.getElementById("export-data").value = exportedData;
    showNotification("数据导出成功", "success");
  } catch (error) {
    showNotification(`导出失败: ${error}`, "error");
    document.getElementById("export-data").value = "";
  }
}

// 导入数据
async function importData() {
  try {
    const importData = document.getElementById("import-data").value.trim();

    if (!importData) {
      showNotification("请输入要导入的数据", "error");
      return;
    }

    let data;

    // 尝试解析数据
    try {
      if (importFormat === "auto") {
        // 尝试作为Base64解码
        try {
          // 增加对Unicode字符的支持
          const decoded = decodeURIComponent(escape(atob(importData)));
          data = JSON.parse(decoded);
          if (data.cookies || data.storage) {
            await importFullFormat(data);
            return;
          }
        } catch (e) {
          // 不是有效的Base64，尝试作为JSON解析
        }

        // 尝试作为JSON解析
        data = JSON.parse(importData);

        // 判断是Cookie Editor格式还是完整格式
        if (Array.isArray(data)) {
          await importCookieEditorFormat(data);
        } else if (data.cookies || data.storage) {
          await importFullFormat(data);
        } else {
          throw new Error("无法识别的数据格式");
        }
      } else if (importFormat === "base64") {
        // 增加对Unicode字符的支持
        const decoded = decodeURIComponent(escape(atob(importData)));
        data = JSON.parse(decoded);
        await importFullFormat(data);
      } else if (importFormat === "cookie-editor") {
        data = JSON.parse(importData);
        if (!Array.isArray(data)) {
          throw new Error("Cookie-Editor格式应该是数组");
        }
        await importCookieEditorFormat(data);
      } else if (importFormat === "json") {
        data = JSON.parse(importData);
        await importFullFormat(data);
      }

      showNotification("数据导入成功，页面即将刷新", "success");
    } catch (error) {
      throw new Error(`解析数据失败: ${error.message}`);
    }
  } catch (error) {
    showNotification(`导入失败: ${error.message}`, "error");
  }
}

// 导入Cookie Editor格式的数据
async function importCookieEditorFormat(cookies) {
  if (!Array.isArray(cookies)) {
    throw new Error("无效的Cookie Editor格式");
  }

  try {
    console.log("开始导入Cookie Editor格式数据...");

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
      cookies: cookies,
      storage: null,
    });

    console.log("Cookie Editor格式数据导入成功");

    // 延迟一秒后刷新页面
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

    // 延迟一秒后刷新页面
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

// 创建新配置
async function createProfile() {
  try {
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

// 加载配置列表
function loadProfiles() {
  chrome.storage.local.get(null, (result) => {
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
          profiles[hostname][profileName] = data[profileName];

          // 缓存当前域名的配置
          if (key === profileKeyPrefix) {
            currentProfilesCache[profileName] = data[profileName];
          }
        }
      }
    }

    // 创建当前域名的配置列表
    const currentHostname = getCurrentHostname();
    const currentProfiles = profiles[currentHostname] || {};

    // 创建包装器，用于存放配置项
    const wrapper = document.createElement("div");
    wrapper.style.paddingBottom = "50px"; // 增加更多底部填充空间

    // 如果没有配置，显示提示，但保持足够的高度
    if (Object.keys(currentProfiles).length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.style.textAlign = "center";
      emptyMessage.style.padding = "60px 20px";
      emptyMessage.style.color = "#666";
      emptyMessage.style.minHeight = "150px"; // 确保有足够的高度
      emptyMessage.textContent = "暂无保存的配置";

      wrapper.appendChild(emptyMessage);
      profilesList.appendChild(wrapper);
      return;
    }

    // 排序配置名称
    const sortedProfileNames = Object.keys(currentProfiles).sort();

    // 添加所有配置
    sortedProfileNames.forEach((profileName, index) => {
      const profile = currentProfiles[profileName];
      const date = profile.date
        ? new Date(profile.date).toLocaleString()
        : new Date().toLocaleString();

      const profileItem = document.createElement("div");
      profileItem.className = "cookie-manager-profile";

      // 为最后一个元素添加额外的底部边距
      if (index === sortedProfileNames.length - 1) {
        profileItem.style.marginBottom = "40px";
      }

      profileItem.innerHTML = createProfileItemHTML(profileName, date);

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

// 应用配置
async function applyProfile(name, profile) {
  try {
    console.log(`开始应用配置: "${name}"`);

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
    await setAllData({
      cookies: profile.cookies || [],
      storage: profile.storage || { localStorage: {}, sessionStorage: {} },
    });

    console.log(`配置 "${name}" 应用成功`);
    showNotification(`配置 "${name}" 已应用，页面即将刷新`, "success");

    // 刷新页面
    refreshPage();
  } catch (error) {
    console.error(`应用配置失败: ${error}`);
    showNotification(`应用配置失败: ${error}`, "error");
  }
}

// 删除配置
function deleteProfile(name) {
  if (!confirm(`确定要删除配置 "${name}" 吗？`)) {
    return;
  }

  const profileKey = getProfileStorageKey();

  chrome.storage.local.get(profileKey, (result) => {
    const profiles = result[profileKey] || {};

    if (profiles[name]) {
      delete profiles[name];

      // 更新存储
      const updateData = {};
      updateData[profileKey] = profiles;

      chrome.storage.local.set(updateData, () => {
        loadProfiles(); // 重新加载配置列表
        showNotification(`配置 "${name}" 已删除`, "success");
      });
    }
  });
}

// 搜索配置
function searchProfiles(query) {
  const profilesList = document.getElementById("profiles-list");
  const profiles = profilesList.querySelectorAll(".cookie-manager-profile");

  if (!query) {
    profiles.forEach((profile) => {
      profile.style.display = "flex";

      // 移除高亮
      const nameElement = profile.querySelector(
        ".cookie-manager-profile-info > div:first-child"
      );
      if (nameElement) {
        nameElement.innerHTML = nameElement.textContent; // 简单地重置文本内容，移除HTML标签
      }
    });
    return;
  }

  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");

  profiles.forEach((profile) => {
    const nameElement = profile.querySelector(
      ".cookie-manager-profile-info > div:first-child"
    );
    if (!nameElement) return;

    const profileName = nameElement.textContent;

    if (profileName.toLowerCase().includes(query.toLowerCase())) {
      profile.style.display = "flex";

      // 添加高亮
      nameElement.innerHTML = profileName.replace(
        regex,
        "<span class='highlight'>$1</span>"
      );
    } else {
      profile.style.display = "none";
    }
  });
}

// 重命名配置
function renameProfile(oldName) {
  // 弹出提示框获取新配置名称
  const newName = prompt("请输入新的配置名称", oldName);

  if (!newName || newName === oldName) {
    return; // 用户取消或没有修改
  }

  // 检查新名称是否已存在
  if (currentProfilesCache[newName]) {
    showNotification(`配置名称 "${newName}" 已存在`, "error");
    return;
  }

  const profileKey = getProfileStorageKey();

  chrome.storage.local.get(profileKey, (result) => {
    const profiles = result[profileKey] || {};

    if (profiles[oldName]) {
      // 复制配置到新名称
      profiles[newName] = { ...profiles[oldName] };

      // 删除旧配置
      delete profiles[oldName];

      // 更新存储
      const updateData = {};
      updateData[profileKey] = profiles;

      chrome.storage.local.set(updateData, () => {
        loadProfiles(); // 重新加载配置列表
        showNotification(`配置已重命名为 "${newName}"`, "success");
      });
    }
  });
}

// 导入为配置
async function importAsProfile() {
  try {
    console.log("开始导入为配置...");
    const importData = document.getElementById("import-data").value.trim();
    console.log("导入数据:", importData ? "有数据" : "无数据");

    if (!importData) {
      showNotification("请输入要导入的数据", "error");
      return;
    }

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
            console.log("检测到完整格式数据");
            data = data;
          } else if (Array.isArray(data)) {
            console.log("检测到Cookie-Editor格式数据");
            data = {
              cookies: data,
              storage: { localStorage: {}, sessionStorage: {} },
            };
          } else {
            throw new Error("无法识别的数据格式");
          }
        } catch (e) {
          console.log("Base64解析失败, 尝试JSON解析", e);
          // 尝试作为JSON解析
          data = JSON.parse(importData);
          console.log("JSON解析结果:", data);
          if (Array.isArray(data)) {
            // Cookie-Editor格式
            console.log("检测到Cookie-Editor格式数据");
            data = {
              cookies: data,
              storage: { localStorage: {}, sessionStorage: {} },
            };
          } else if (!(data.cookies || data.storage)) {
            throw new Error("无法识别的数据格式");
          }
        }
      } else if (importFormat === "base64") {
        // 增加对Unicode字符的支持
        const decoded = decodeURIComponent(escape(atob(importData)));
        data = JSON.parse(decoded);
      } else if (importFormat === "cookie-editor") {
        data = JSON.parse(importData);
        if (!Array.isArray(data)) {
          throw new Error("Cookie-Editor格式应该是数组");
        }
        // 转换为完整格式
        data = {
          cookies: data,
          storage: { localStorage: {}, sessionStorage: {} },
        };
      } else if (importFormat === "json") {
        data = JSON.parse(importData);
        if (Array.isArray(data)) {
          // 可能是Cookie-Editor格式的JSON
          data = {
            cookies: data,
            storage: { localStorage: {}, sessionStorage: {} },
          };
        }
      }

      // 验证数据
      if (!data || (!data.cookies && !data.storage)) {
        console.error("无效的数据格式");
        showNotification("无效的数据格式", "error");
        return;
      }

      console.log("解析后的数据:", data);

      // 弹出提示框获取配置名称
      const profileName = prompt("请输入配置名称");

      if (!profileName) {
        console.log("用户取消了操作");
        return; // 用户取消了操作
      }

      console.log(`保存配置: "${profileName}"`);

      // 保存配置
      saveProfileData(
        profileName,
        data.cookies || [],
        data.storage || { localStorage: {}, sessionStorage: {} }
      );

      // 应用配置并刷新页面
      await applyProfile(profileName, {
        cookies: data.cookies || [],
        storage: data.storage || { localStorage: {}, sessionStorage: {} },
      });

      console.log("导入为配置完成");
      // 清空导入数据
      document.getElementById("import-data").value = "";
    } catch (error) {
      throw new Error(`解析数据失败: ${error.message}`);
    }
  } catch (error) {
    showNotification(`导入配置失败: ${error.message}`, "error");
  }
}

// 保存配置数据
function saveProfileData(profileName, cookies, storage) {
  const profileKey = getProfileStorageKey();

  chrome.storage.local.get(profileKey, (result) => {
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

    chrome.storage.local.set(updateData, () => {
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

// 导出配置
function exportProfile(name, profile) {
  // 切换到导出标签
  document.querySelector(".cookie-manager-tab[data-tab='export']").click();

  // 设置导出格式为JSON
  document.getElementById("export-format").value = "json";
  exportFormat = "json";

  // 设置导出数据
  document.getElementById("export-data").value = JSON.stringify(
    profile,
    null,
    2
  );

  showNotification(`配置 "${name}" 已导出`, "success");
}

// 初始化事件
function initEvents() {
  // 导出格式选择
  document.getElementById("export-format").addEventListener("change", (e) => {
    exportFormat = e.target.value;
    // 不再在切换格式时自动导出数据
    exportData();
  });

  // 导入格式选择
  document.getElementById("import-format").addEventListener("change", (e) => {
    importFormat = e.target.value;
  });

  // 导出按钮
  document.getElementById("btn-export").addEventListener("click", exportData);

  // 复制按钮
  document
    .getElementById("btn-copy")
    .addEventListener("click", copyToClipboard);

  // 导入按钮
  document.getElementById("btn-import").addEventListener("click", importData);

  // 导入为配置按钮
  document
    .getElementById("btn-import-profile")
    .addEventListener("click", importAsProfile);

  // 创建新配置按钮
  document
    .getElementById("btn-create-profile")
    .addEventListener("click", createProfile);

  // 配置搜索
  document.getElementById("profile-search").addEventListener("input", (e) => {
    searchProfiles(e.target.value.trim());
  });

  // 配置名称输入框回车事件
  document.getElementById("profile-name").addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      createProfile();
    }
  });
}

// 初始化
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 获取当前标签页
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    currentTab = tabs[0];

    // 更新主机名显示
    updateHostnameDisplay();

    // 检查content script状态
    await ensureContentScriptLoaded();

    // 初始化UI和事件
    initTabs();
    initEvents();

    // 加载配置列表
    loadProfiles();

    // 初始加载时自动导出数据
    exportData();
  } catch (error) {
    console.error("初始化失败:", error);
    showNotification("初始化失败，请刷新页面重试", "error");
  }
});

// 配置项HTML生成器，确保结构与原脚本一致
function createProfileItemHTML(profileName, date) {
  return `
    <div class="cookie-manager-profile-info">
      <div style="font-weight:bold;">${profileName}</div>
      <div style="font-size:11px;color:#666;">${date}</div>
    </div>
    <div class="cookie-manager-profile-actions">
      <button class="cookie-manager-btn-apply">应用</button>
      <button class="cookie-manager-btn-export">导出</button>
      <button class="cookie-manager-btn-rename">重命名</button>
      <button class="cookie-manager-btn-delete">删除</button>
    </div>
  `;
}

// 页面刷新函数
function refreshPage(delay = 1000) {
  // 延迟指定时间后刷新页面
  setTimeout(() => {
    chrome.tabs.reload();
  }, delay);
}
