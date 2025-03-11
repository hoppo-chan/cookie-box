// ==UserScript==
// @name         饼干盒子
// @namespace    none
// @version      1.0.0
// @description  get cookie and storage then to json
// @author       hoppo-chan
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_cookie
// @grant        GM_notification
// @grant        unsafeWindow
// @connect      *
// @connect      self
// @connect      localhost
// @connect      127.0.0.1
// @include       *
// @include       self
// @include       localhost
// @include       127.0.0.1
// @run-at       document-start
// @downloadURL  https://raw.githubusercontent.com/hoppo-chan/cookie-box/refs/heads/main/cookie_box.user.js
// ==/UserScript==

(function () {
  "use strict";

  // 样式定义
  const styles = `
        #cookie-manager-icon {
            position: fixed;
            width: 32px;
            height: 32px;
            right: 20px;
            top: 60px;
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23777"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM8.5 12a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-4.5 1.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>');
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
            cursor: pointer;
            z-index: 9999;
            opacity: 0.7;
            transition: opacity 0.3s;
            border-radius: 50%;
        }
        
        #cookie-manager-icon:hover {
            opacity: 1;
        }
        
        #cookie-manager-panel {
            position: fixed;
            width: 500px;
            max-width: 90vw;
            max-height: 90vh;
            min-height: 400px; /* 添加最小高度 */
            background-color: #fff;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border-radius: 8px;
            z-index: 10000;
            overflow: hidden;
            display: none;
            font-family: Arial, sans-serif;
            color: #333;
        }
        
        #cookie-manager-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background-color: rgb(73, 154, 224);
            border-bottom: 1px solid #ddd;
            cursor: move;
        }
        
        #cookie-manager-title {
            color: #fff;
            font-weight: bold;
            font-size: 16px;
        }
        
        #cookie-manager-close {
            cursor: pointer;
            font-size: 20px;
            line-height: 20px;
        }
        
        #cookie-manager-content {
            padding: 16px;
            max-height: calc(90vh - 40px);
            min-height: 320px; /* 添加最小高度 */
            overflow-y: auto;
        }
        
        .cookie-manager-tab-container {
            display: flex;
            margin-bottom: 16px;
            border-bottom: 1px solid #ddd;
        }
        
        .cookie-manager-tab {
            padding: 8px 16px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
        }
        
        .cookie-manager-tab.cookie-manager-active {
            border-bottom: 2px solid #4a90e2;
            font-weight: bold;
        }
        
        .cookie-manager-tab-content {
            display: none;
            min-height: 300px; /* 确保所有标签内容有一致的最小高度 */
        }
        
        .cookie-manager-tab-content.cookie-manager-active {
            display: block;
        }
        
        .cookie-manager-input-group {
            margin-bottom: 16px;
        }
        
        .cookie-manager-input-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
        }
        
        .cookie-manager-input-group select, .cookie-manager-input-group input, .cookie-manager-input-group textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        
        .cookie-manager-input-group textarea {
            min-height: 120px;
            font-family: monospace;
            font-size: 12px;
        }
        
        .cookie-manager-btn {
            background-color: #4a90e2;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 8px;
            margin-bottom: 8px;
        }
        
        .cookie-manager-btn:hover {
            background-color: #357ab8;
        }
        
        .cookie-manager-btn-danger {
            background-color: #e25555;
        }
        
        .cookie-manager-btn-danger:hover {
            background-color: #c13e3e;
        }
        
        .cookie-manager-profile {
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .cookie-manager-profile-info {
            flex: 1;
        }
        
        .cookie-manager-profile-actions {
            display: flex;
            gap: 8px;
        }
        
        .cookie-manager-btn-apply, .cookie-manager-btn-delete, .cookie-manager-btn-export, .cookie-manager-btn-rename {
            cursor: pointer;
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            font-size: 13px;
            transition: background-color 0.2s;
        }
        
        .cookie-manager-btn-apply {
            background-color: #4a90e2;
            color: white;
        }
        
        .cookie-manager-btn-apply:hover {
            background-color: #357ab8;
        }
        
        .cookie-manager-btn-export {
            background-color: #5cb85c;
            color: white;
        }
        
        .cookie-manager-btn-export:hover {
            background-color: #4cae4c;
        }
        
        .cookie-manager-btn-rename {
            background-color: #f0ad4e;
            color: white;
        }
        
        .cookie-manager-btn-rename:hover {
            background-color: #ec971f;
        }
        
        .cookie-manager-btn-delete {
            background-color: #e25555;
            color: white;
        }
        
        .cookie-manager-btn-delete:hover {
            background-color: #c13e3e;
        }
        
        .cookie-manager-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 4px;
            background-color: #333;
            color: white;
            z-index: 10001;
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        .cookie-manager-notification.cookie-manager-show {
            opacity: 1;
        }
        
        .cookie-manager-notification.cookie-manager-info {
            background-color: #4a90e2;
        }
        
        .cookie-manager-notification.cookie-manager-success {
            background-color: #5cb85c;
        }
        
        .cookie-manager-notification.cookie-manager-error {
            background-color: #d9534f;
        }
        
        .cookie-manager-inline-form {
            display: flex;
            gap: 10px;
            align-items: stretch;
            margin-bottom: 16px;
        }
        
        .cookie-manager-inline-form input {
            flex: 1;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
            height: 36px;
            margin: 0;
        }
        
        .cookie-manager-inline-form .cookie-manager-btn {
            margin: 0;
            height: 36px;
            box-sizing: border-box;
            white-space: nowrap;
        }
        
        #profiles-list {
            max-height: 230px; /* 增加高度，留出更多空间 */
            min-height: 170px; /* 添加最小高度，即使没有配置项也保持高度 */
            overflow-y: auto;
            padding-right: 5px;
            padding-bottom: 5px;
            margin-bottom: 5px;
        }
        
        /* 增加底部容器高度，确保滚动后能看到底部内容 */
        #profiles-container.cookie-manager-input-group {
            margin-bottom: 0;
        }
        
        /* 确保标题始终可见 */
        #profiles-container.cookie-manager-input-group > .cookie-manager-header-row {
            position: sticky;
            top: 0;
            background-color: white;
            padding: 5px 0;
            margin-bottom: 10px;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        #profile-search {
            width: 150px;
            height: 28px;
            padding: 0 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 12px;
        }
        
        #profile-search:focus {
            border-color: #4a90e2;
            outline: none;
        }
        
        /* 添加搜索结果高亮样式 */
        .cookie-manager-profile-info .highlight {
            background-color: #ffffa0;
            font-weight: bold;
        }
        
        #profiles-list::-webkit-scrollbar {
            width: 8px;
        }
        
        #profiles-list::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
        }
        
        #profiles-list::-webkit-scrollbar-thumb {
            background: #c0c0c0;
            border-radius: 4px;
        }
        
        #profiles-list::-webkit-scrollbar-thumb:hover {
            background: #a0a0a0;
        }
        
        #profiles-list > div {
    `;

  // 创建UI元素
  function createUI() {
    GM_addStyle(styles);

    // 获取保存的图标位置
    const savedPosition = GM_getValue("cookieIconPosition", {
      left: 20,
      top: 60,
    });

    // 创建图标和面板
    const icon = document.createElement("div");
    icon.id = "cookie-manager-icon";
    icon.title = "饼干盒子 (点击打开，拖动调整位置)";
    // 设置保存的位置
    icon.style.left = `${savedPosition.left}px`;
    icon.style.top = `${savedPosition.top}px`;
    document.body.appendChild(icon);

    const panel = document.createElement("div");
    panel.id = "cookie-manager-panel";
    panel.innerHTML = `
            <div id="cookie-manager-header">
                <div id="cookie-manager-title">饼干盒子 - ${getCurrentHostname()}</div>
                <div id="cookie-manager-close">×</div>
            </div>
            <div id="cookie-manager-content">
                <div class="cookie-manager-tab-container">
                    <div class="cookie-manager-tab cookie-manager-active" data-tab="export">导出</div>
                    <div class="cookie-manager-tab" data-tab="import">导入</div>
                    <div class="cookie-manager-tab" data-tab="profiles">配置管理</div>
                </div>
                
                <div class="cookie-manager-tab-content cookie-manager-active" id="export-tab">
                    <div class="cookie-manager-input-group">
                        <label>导出格式</label>
                        <select id="export-format">
                            <option value="cookie-editor">Cookie-Editor格式 (仅Cookie)</option>
                            <option value="json">JSON格式 (Cookie+Storage)</option>
                            <option value="base64">Base64加密 (Cookie+Storage)</option>
                        </select>
                    </div>
                    <div class="cookie-manager-input-group">
                        <label>数据内容</label>
                        <textarea id="export-data" readonly></textarea>
                    </div>
                    <button id="btn-export" class="cookie-manager-btn">导出数据</button>
                    <button id="btn-copy" class="cookie-manager-btn">复制到剪贴板</button>
                </div>
                
                <div class="cookie-manager-tab-content" id="import-tab">
                    <div class="cookie-manager-input-group">
                        <label>导入格式</label>
                        <select id="import-format">
                            <option value="auto">自动检测</option>
                            <option value="cookie-editor">Cookie-Editor格式 (仅Cookie)</option>
                            <option value="json">JSON格式 (Cookie+Storage)</option>
                            <option value="base64">Base64加密 (Cookie+Storage)</option>
                        </select>
                    </div>
                    <div class="cookie-manager-input-group">
                        <label>数据内容</label>
                        <textarea id="import-data" placeholder="请粘贴要导入的数据..."></textarea>
                    </div>
                    <button id="btn-import" class="cookie-manager-btn">导入数据</button>
                    <button id="btn-import-as-profile" class="cookie-manager-btn">另存为配置</button>
                </div>
                
                <div class="cookie-manager-tab-content" id="profiles-tab">
                    <div class="cookie-manager-input-group">
                        <label>创建新配置</label>
                        <div class="cookie-manager-inline-form">
                            <input type="text" id="profile-name" placeholder="输入配置名称...">
                            <button id="btn-create-profile" class="cookie-manager-btn">创建配置</button>
                        </div>
                    </div>
                    
                    <div id="profiles-container" class="cookie-manager-input-group">
                        <div class="cookie-manager-header-row">
                            <label>已保存的配置（${getCurrentHostname()}）</label>
                            <input type="text" id="profile-search" placeholder="搜索配置..." />
                        </div>
                        <div id="profiles-list">
                            <!-- 配置列表将动态加载 -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    document.body.appendChild(panel);

    // 使图标可拖动
    makeDraggable(document.getElementById("cookie-manager-icon"));

    // 使面板可拖动（通过标题栏）
    makeDraggable(panel, document.getElementById("cookie-manager-header"));

    // 事件监听器
    document
      .getElementById("cookie-manager-close")
      .addEventListener("click", togglePanel);

    // 标签切换
    const tabs = document.querySelectorAll(".cookie-manager-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("cookie-manager-active"));
        tab.classList.add("cookie-manager-active");

        const tabContents = document.querySelectorAll(
          ".cookie-manager-tab-content"
        );
        tabContents.forEach((content) =>
          content.classList.remove("cookie-manager-active")
        );

        const tabName = tab.getAttribute("data-tab");
        document
          .getElementById(`${tabName}-tab`)
          .classList.add("cookie-manager-active");
      });
    });

    // 其他按钮事件
    document.getElementById("btn-export").addEventListener("click", exportData);
    document
      .getElementById("btn-copy")
      .addEventListener("click", copyToClipboard);
    document.getElementById("btn-import").addEventListener("click", importData);
    document
      .getElementById("btn-import-as-profile")
      .addEventListener("click", importAsProfile);
    document
      .getElementById("btn-create-profile")
      .addEventListener("click", createProfile);

    // 加载配置
    loadProfiles();

    // 添加搜索框事件
    document
      .getElementById("profile-search")
      .addEventListener("input", function () {
        searchProfiles(this.value);
      });
  }

  // 获取当前主机名（域名）
  function getCurrentHostname() {
    return window.location.hostname || "unknown";
  }

  // 获取配置存储键（按域名区分）
  function getProfileStorageKey() {
    return "cookieProfiles_" + getCurrentHostname();
  }

  // 切换面板显示/隐藏
  function togglePanel() {
    const panel = document.getElementById("cookie-manager-panel");
    const icon = document.getElementById("cookie-manager-icon");

    if (panel.style.display === "block") {
      panel.style.display = "none";
      // 移除点击外部关闭事件
      document.removeEventListener("click", handleOutsideClick);
    } else {
      // 先显示面板但设为不可见，以获取其实际尺寸
      panel.style.display = "block";
      panel.style.visibility = "hidden";

      // 设置面板位置
      const iconRect = icon.getBoundingClientRect();
      const panelWidth = 500; // 面板宽度
      const panelHeight = Math.min(
        panel.offsetHeight,
        window.innerHeight * 0.9
      ); // 面板高度（最大90vh）
      const margin = 10; // 边距

      // 计算可用空间
      const spaceRight = window.innerWidth - iconRect.right - margin;
      const spaceLeft = iconRect.left - margin;
      const spaceBelow = window.innerHeight - iconRect.bottom - margin;
      const spaceAbove = iconRect.top - margin;

      let top, left;

      // 水平位置计算
      if (spaceRight >= panelWidth) {
        // 如果右侧空间足够，优先放在右侧
        left = iconRect.right + margin;
      } else if (spaceLeft >= panelWidth) {
        // 如果左侧空间足够，放在左侧
        left = iconRect.left - panelWidth - margin;
      } else {
        // 如果两侧都不够，居中显示
        left = Math.max(0, (window.innerWidth - panelWidth) / 2);
      }

      // 垂直位置计算
      if (spaceBelow >= panelHeight) {
        // 如果下方空间足够，放在下方
        top = iconRect.bottom + margin;
      } else if (spaceAbove >= panelHeight) {
        // 如果上方空间足够，放在上方
        top = iconRect.top - panelHeight - margin;
      } else {
        // 如果上下都不够，居中显示
        top = Math.max(0, (window.innerHeight - panelHeight) / 2);
      }

      // 应用位置
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.visibility = "visible";

      // 添加点击外部关闭事件（延迟添加，避免立即触发）
      setTimeout(() => {
        document.addEventListener("click", handleOutsideClick);
      }, 10);

      // 加载当前数据
      exportData();
    }
  }

  // 处理点击面板外部事件
  function handleOutsideClick(e) {
    const panel = document.getElementById("cookie-manager-panel");
    const icon = document.getElementById("cookie-manager-icon");

    // 如果点击的是图标本身，不做处理（因为图标点击有自己的处理函数）
    if (icon.contains(e.target)) {
      return;
    }

    // 如果面板不存在或者设置了"处理对话框中"标记，不做处理
    if (!panel || window.isHandlingDialog) {
      return;
    }

    // 如果点击的不是面板内部元素，则关闭面板
    if (!panel.contains(e.target)) {
      togglePanel(); // 使用togglePanel来关闭面板
    }
  }

  // 获取所有Cookie
  async function getAllCookies() {
    return new Promise((resolve, reject) => {
      try {
        // 获取当前域名
        const currentDomain = window.location.hostname;
        const domainParts = currentDomain.split(".");
        const domains = [];

        // 构建域名列表（包括子域名）
        for (let i = 0; i < domainParts.length - 1; i++) {
          domains.push("." + domainParts.slice(i).join("."));
        }
        domains.push(currentDomain);

        console.log("获取Cookie的域名列表:", domains);

        // 存储所有cookie的数组
        let allCookies = [];
        let processedDomains = 0;

        // 为每个域名获取cookie
        domains.forEach((domain) => {
          console.log("正在获取域名的Cookie:", domain);

          GM_cookie.list({ domain: domain }, (cookies, error) => {
            processedDomains++;

            if (error) {
              console.error(`获取Cookie出错 (${domain}):`, error);
            } else if (cookies) {
              console.log(`域名 ${domain} 找到 ${cookies.length} 个Cookie`);
              allCookies = allCookies.concat(cookies);
            }

            // 当所有域名都处理完毕时
            if (processedDomains === domains.length) {
              // 去重（基于name+domain+path）
              const uniqueCookies = allCookies.filter(
                (cookie, index, self) =>
                  index ===
                  self.findIndex(
                    (c) =>
                      c.name === cookie.name &&
                      c.domain === cookie.domain &&
                      c.path === cookie.path
                  )
              );

              console.log("总共找到 " + uniqueCookies.length + " 个唯一Cookie");

              if (uniqueCookies.length === 0) {
                console.warn("未找到任何Cookie");
                showNotification("未找到任何Cookie，请检查权限设置", "warning");
              }

              resolve(uniqueCookies);
            }
          });
        });
      } catch (e) {
        console.error("获取Cookie时发生错误:", e);
        reject(e);
      }
    });
  }

  // 设置Cookie
  async function setCookie(cookie) {
    return new Promise((resolve, reject) => {
      try {
        // 确保必要的字段存在
        if (!cookie.name || !cookie.domain) {
          throw new Error("Cookie缺少必要字段");
        }

        // 确保domain值有效
        let domain = cookie.domain;
        // 处理域名前的点，确保在设置时正确处理
        if (domain.startsWith(".")) {
          // 对于以点开头的域名，我们需要移除点然后设置
          domain = domain.substring(1);
        }

        // 构造URL，确保与cookie.secure一致
        const url = cookie.secure ? "https://" + domain : "http://" + domain;

        // 构建cookie设置对象
        const cookieData = {
          name: cookie.name,
          value: cookie.value || "",
          url: url, // 使用构造的URL
          domain: domain,
          path: cookie.path || "/",
          secure: cookie.secure || false,
          httpOnly: cookie.httpOnly || false,
          sameSite: cookie.sameSite || "lax",
          expirationDate:
            cookie.expirationDate ||
            Math.floor(Date.now() / 1000) + 86400 * 365,
          storeId: cookie.storeId,
          firstPartyDomain: cookie.firstPartyDomain || "",
        };

        console.log("设置Cookie:", cookieData); // 添加日志

        GM_cookie.set(cookieData, (error) => {
          if (error) {
            console.error("设置Cookie失败:", error, cookieData);
            reject(error);
          } else {
            console.log("Cookie设置成功:", cookie.name);
            resolve();
          }
        });
      } catch (e) {
        console.error("设置Cookie时发生错误:", e);
        reject(e);
      }
    });
  }

  // 删除Cookie
  async function deleteCookie(cookie) {
    return new Promise((resolve, reject) => {
      try {
        // 处理域名
        let domain = cookie.domain;
        // 处理域名前的点，确保在删除时正确处理
        if (domain.startsWith(".")) {
          domain = domain.substring(1);
        }

        // 构造URL，确保与cookie.secure一致
        const url = cookie.secure ? "https://" + domain : "http://" + domain;

        console.log("删除Cookie:", cookie.name, "域名:", domain, "URL:", url);

        GM_cookie.delete(
          {
            name: cookie.name,
            url: url,
            path: cookie.path || "/",
            domain: domain,
            storeId: cookie.storeId,
            firstPartyDomain: cookie.firstPartyDomain || "",
          },
          (error) => {
            if (error) {
              console.error("删除Cookie失败:", error, cookie);
              reject(error);
            } else {
              console.log("Cookie删除成功:", cookie.name);
              resolve();
            }
          }
        );
      } catch (e) {
        console.error("删除Cookie时发生错误:", e);
        reject(e);
      }
    });
  }

  // 获取所有存储数据
  function getAllStorage() {
    const localStorage = {};
    const sessionStorage = {};

    try {
      // 获取localStorage
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        localStorage[key] = window.localStorage.getItem(key);
      }

      // 获取sessionStorage
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        sessionStorage[key] = window.sessionStorage.getItem(key);
      }
    } catch (e) {
      showNotification("获取存储数据时出错: " + e.message, "error");
    }

    return { localStorage, sessionStorage };
  }

  // 设置所有存储数据
  function setAllStorage(data) {
    try {
      // 设置localStorage
      if (data.localStorage) {
        for (const key in data.localStorage) {
          window.localStorage.setItem(key, data.localStorage[key]);
        }
      }

      // 设置sessionStorage
      if (data.sessionStorage) {
        for (const key in data.sessionStorage) {
          window.sessionStorage.setItem(key, data.sessionStorage[key]);
        }
      }
    } catch (e) {
      showNotification("设置存储数据时出错: " + e.message, "error");
    }
  }

  // 导出数据
  async function exportData() {
    const format = document.getElementById("export-format").value;
    const output = document.getElementById("export-data");

    try {
      const cookies = await getAllCookies();

      if (format === "cookie-editor") {
        // 仅导出Cookie (Cookie-Editor格式)
        output.value = JSON.stringify(cookies, null, 4);
      } else {
        // 导出Cookie和Storage
        const storage = getAllStorage();
        const data = { cookies, storage };

        if (format === "base64") {
          // Base64加密（支持UTF-8）
          const jsonString = JSON.stringify(data);
          // 将字符串转换为UTF-8编码
          const utf8Bytes = new TextEncoder().encode(jsonString);
          // 将UTF-8字节转换为二进制字符串
          const binaryString = Array.from(utf8Bytes)
            .map((byte) => String.fromCharCode(byte))
            .join("");
          // 进行Base64编码
          output.value = btoa(binaryString);
        } else {
          // 普通JSON
          output.value = JSON.stringify(data, null, 4);
        }
      }
    } catch (e) {
      showNotification("导出数据时出错: " + e.message, "error");
    }
  }

  // 清除所有cookie和storage数据
  async function clearAllData() {
    try {
      // 清除所有cookies
      const currentCookies = await getAllCookies();
      for (const cookie of currentCookies) {
        await deleteCookie(cookie);
      }

      // 清除localStorage
      window.localStorage.clear();

      // 清除sessionStorage
      window.sessionStorage.clear();

      return true;
    } catch (e) {
      showNotification("清除数据失败: " + e.message, "error");
      return false;
    }
  }

  // 导入数据
  async function importData() {
    const format = document.getElementById("import-format").value;
    const input = document.getElementById("import-data").value.trim();

    if (!input) {
      showNotification("请输入要导入的数据", "error");
      return;
    }

    try {
      // 提示用户正在清空数据
      showNotification("正在清空当前数据...", "info");

      // 先清空当前所有数据
      const clearResult = await clearAllData();

      if (!clearResult) {
        showNotification("清空数据失败，导入操作已取消", "error");
        return;
      }

      showNotification("数据清空成功，正在导入新数据...", "info");

      let data;

      // 根据格式解析数据
      if (format === "auto") {
        // 自动检测格式
        try {
          // 尝试解析为JSON
          data = JSON.parse(input);

          // 判断是否为Cookie-Editor格式
          if (
            Array.isArray(data) &&
            data.length > 0 &&
            data[0].name &&
            data[0].domain
          ) {
            await importCookieEditorFormat(data);
            return;
          } else if (data.cookies && data.storage) {
            // 常规JSON格式
            await importFullFormat(data);
            return;
          }
        } catch (e) {
          // 尝试Base64解码
          try {
            const base64Decoded = atob(input);
            // 将二进制字符串转换回UTF-8字节数组
            const utf8Bytes = new Uint8Array(
              base64Decoded.split("").map((c) => c.charCodeAt(0))
            );
            // 将UTF-8字节数组转换为字符串
            const jsonString = new TextDecoder().decode(utf8Bytes);
            data = JSON.parse(jsonString);
            if (data.cookies && data.storage) {
              await importFullFormat(data);
              return;
            }
          } catch (e2) {
            showNotification("无法解析输入数据，请指定正确的格式", "error");
            return;
          }
        }
      } else if (format === "base64") {
        // Base64格式
        try {
          const base64Decoded = atob(input);
          // 将二进制字符串转换回UTF-8字节数组
          const utf8Bytes = new Uint8Array(
            base64Decoded.split("").map((c) => c.charCodeAt(0))
          );
          // 将UTF-8字节数组转换为字符串
          const jsonString = new TextDecoder().decode(utf8Bytes);
          data = JSON.parse(jsonString);
          await importFullFormat(data);
        } catch (e) {
          showNotification("Base64解码失败", "error");
          return;
        }
      } else if (format === "cookie-editor") {
        // Cookie-Editor格式
        try {
          data = JSON.parse(input);
          await importCookieEditorFormat(data);
        } catch (e) {
          showNotification("解析Cookie-Editor格式失败", "error");
          return;
        }
      } else {
        // 普通JSON
        try {
          data = JSON.parse(input);
          await importFullFormat(data);
        } catch (e) {
          showNotification("解析JSON格式失败", "error");
          return;
        }
      }
    } catch (e) {
      showNotification("导入数据时出错: " + e.message, "error");
    }
  }

  // 导入Cookie-Editor格式
  async function importCookieEditorFormat(cookies) {
    try {
      // 设置新Cookie
      for (const cookie of cookies) {
        await setCookie(cookie);
      }

      showNotification("成功导入 " + cookies.length + " 个Cookie", "success");

      // 询问是否刷新页面
      if (confirm("数据导入成功，是否立即刷新页面以应用更改？")) {
        window.location.reload();
      }
    } catch (e) {
      showNotification("导入Cookie-Editor格式失败: " + e.message, "error");
    }
  }

  // 导入完整格式 (Cookie + Storage)
  async function importFullFormat(data) {
    try {
      // 导入Cookie
      if (data.cookies && Array.isArray(data.cookies)) {
        // 只设置cookies，不需要清除和刷新（会在importCookieEditorFormat中处理）
        for (const cookie of data.cookies) {
          await setCookie(cookie);
        }
        showNotification(
          "成功导入 " + data.cookies.length + " 个Cookie",
          "success"
        );
      }

      // 导入Storage
      if (data.storage) {
        setAllStorage(data.storage);
        showNotification("成功导入存储数据", "success");
      }

      // 询问是否刷新页面
      if (confirm("数据导入成功，是否立即刷新页面以应用更改？")) {
        window.location.reload();
      }
    } catch (e) {
      showNotification("导入完整格式失败: " + e.message, "error");
    }
  }

  // 复制到剪贴板
  function copyToClipboard() {
    const output = document.getElementById("export-data");
    output.select();
    document.execCommand("copy");
    showNotification("已复制到剪贴板", "success");
  }

  // 创建新配置（直接获取当前数据）
  async function createProfile() {
    const profileName = document.getElementById("profile-name").value.trim();

    if (!profileName) {
      showNotification("请输入配置名称", "error");
      return;
    }

    const profiles = GM_getValue(getProfileStorageKey(), {});

    if (profiles[profileName]) {
      showNotification("配置名称已存在", "error");
      return;
    }

    try {
      // 获取当前的Cookie数据
      const cookies = await getAllCookies();

      // 获取当前的Storage数据
      const storage = getAllStorage();

      // 创建新配置
      profiles[profileName] = {
        date: new Date().toISOString(),
        cookies: cookies,
        storage: storage,
      };

      // 保存配置
      GM_setValue(getProfileStorageKey(), profiles);

      // 清空输入
      document.getElementById("profile-name").value = "";

      // 更新配置列表
      loadProfiles();

      showNotification("配置创建成功", "success");
    } catch (e) {
      showNotification("创建配置失败: " + e.message, "error");
    }
  }

  function loadProfiles() {
    const profileList = document.getElementById("profiles-list");
    const profiles = GM_getValue(getProfileStorageKey(), {});

    // 清空列表
    profileList.innerHTML = "";

    // 创建包装器，用于存放配置项
    const wrapper = document.createElement("div");
    wrapper.style.paddingBottom = "50px"; // 增加更多底部填充空间

    // 如果没有配置，显示提示，但保持足够的高度
    if (Object.keys(profiles).length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.style.textAlign = "center";
      emptyMessage.style.padding = "60px 20px";
      emptyMessage.style.color = "#666";
      emptyMessage.style.minHeight = "150px"; // 确保有足够的高度
      emptyMessage.textContent = "暂无保存的配置";

      wrapper.appendChild(emptyMessage);
      profileList.appendChild(wrapper);
      return;
    }

    // 添加所有配置
    const profileNames = Object.keys(profiles);
    profileNames.forEach((name, index) => {
      const profile = profiles[name];
      const date = new Date(profile.date).toLocaleString();

      const profileElem = document.createElement("div");
      profileElem.className = "cookie-manager-profile";

      // 为最后一个元素添加额外的底部边距
      if (index === profileNames.length - 1) {
        profileElem.style.marginBottom = "40px";
      }

      profileElem.innerHTML = `
                <div class="cookie-manager-profile-info">
                    <div style="font-weight:bold;">${name}</div>
                    <div style="font-size:11px;color:#666;">${date}</div>
                </div>
                <div class="cookie-manager-profile-actions">
                    <button class="cookie-manager-btn-apply">应用</button>
                    <button class="cookie-manager-btn-export">导出</button>
                    <button class="cookie-manager-btn-rename">重命名</button>
                    <button class="cookie-manager-btn-delete">删除</button>
                </div>
            `;

      // 应用配置按钮
      profileElem
        .querySelector(".cookie-manager-btn-apply")
        .addEventListener("click", () => {
          applyProfile(name, profile);
        });

      // 导出配置按钮
      profileElem
        .querySelector(".cookie-manager-btn-export")
        .addEventListener("click", () => {
          exportProfile(name, profile);
        });

      // 重命名配置按钮
      profileElem
        .querySelector(".cookie-manager-btn-rename")
        .addEventListener("click", () => {
          renameProfile(name);
        });

      // 删除配置按钮
      profileElem
        .querySelector(".cookie-manager-btn-delete")
        .addEventListener("click", () => {
          deleteProfile(name);
        });

      wrapper.appendChild(profileElem);
    });

    // 添加一个额外的间隔元素，确保最后一个配置项有足够的下方空间
    const spacer = document.createElement("div");
    spacer.style.height = "60px";
    spacer.style.display = "block";
    wrapper.appendChild(spacer);

    // 将包装器添加到列表中
    profileList.appendChild(wrapper);
  }

  async function applyProfile(name, profile) {
    try {
      // 设置标记表示正在处理对话框，防止点击事件关闭面板
      window.isHandlingDialog = true;

      if (
        !confirm(
          `确定要应用配置"${name}"吗？这将覆盖当前的Cookie和Storage数据。`
        )
      ) {
        window.isHandlingDialog = false;
        return;
      }

      // 对话框处理完毕，移除标记
      setTimeout(() => {
        window.isHandlingDialog = false;
      }, 100);

      // 显示清空数据的通知
      showNotification("正在清空当前数据...", "info");

      // 清空当前所有数据
      const clearResult = await clearAllData();

      if (!clearResult) {
        showNotification("清空数据失败，应用配置已取消", "error");
        return;
      }

      showNotification("数据清空成功，正在应用配置...", "info");

      console.log(`开始应用配置: "${name}"`, {
        cookiesCount: profile.cookies ? profile.cookies.length : 0,
        hasStorage: !!profile.storage,
      });

      let success = true;
      let message = "";

      // 应用Cookie
      if (profile.cookies && Array.isArray(profile.cookies)) {
        try {
          console.log(`正在设置 ${profile.cookies.length} 个Cookie`);

          // 设置配置中的Cookie
          for (const cookie of profile.cookies) {
            await setCookie(cookie);
          }

          console.log("所有Cookie设置完成");
        } catch (e) {
          success = false;
          message += "Cookie设置失败: " + e.message + "; ";
          console.error("设置Cookie时发生错误:", e);
        }
      }

      // 应用Storage
      if (profile.storage) {
        try {
          console.log("正在设置Storage数据");

          setAllStorage(profile.storage);

          console.log("Storage数据设置完成");
        } catch (e) {
          success = false;
          message += "Storage设置失败: " + e.message;
          console.error("设置Storage时发生错误:", e);
        }
      }

      if (success) {
        showNotification(`配置"${name}"应用成功`, "success");

        // 询问是否刷新页面
        if (confirm("配置应用成功，是否立即刷新页面以应用更改？")) {
          window.location.reload();
        }
      } else {
        showNotification("应用配置部分失败: " + message, "error");
      }
    } catch (e) {
      window.isHandlingDialog = false;
      showNotification("应用配置失败: " + e.message, "error");
      console.error("应用配置时发生错误:", e);
    }
  }

  function deleteProfile(name) {
    try {
      // 设置标记表示正在处理对话框，防止点击事件关闭面板
      window.isHandlingDialog = true;

      // 显示确认对话框
      const confirmed = confirm(`确定要删除配置"${name}"吗？`);

      // 对话框处理完毕，移除标记
      setTimeout(() => {
        window.isHandlingDialog = false;
      }, 100);

      if (!confirmed) return;

      // 获取所有配置
      const profiles = GM_getValue(getProfileStorageKey(), {});

      // 删除指定配置
      delete profiles[name];

      // 保存更新后的配置
      GM_setValue(getProfileStorageKey(), profiles);

      // 更新配置列表
      loadProfiles();

      showNotification(`配置"${name}"已删除`, "success");

      // 检查是否删除了所有配置，如果是，重新调整面板大小
      if (Object.keys(profiles).length === 0) {
        // 添加一个小延迟，确保DOM更新完成
        setTimeout(() => {
          // 刷新所有标签页的高度，确保界面一致
          const tabContents = document.querySelectorAll(
            ".cookie-manager-tab-content"
          );
          tabContents.forEach((content) => {
            // 重新触发布局计算
            content.style.minHeight = "300px";
          });
        }, 100);
      }
    } catch (e) {
      // 发生错误时也移除标记
      window.isHandlingDialog = false;
      showNotification(`删除配置失败: ${e.message}`, "error");
    }
  }

  function searchProfiles(query) {
    const profiles = GM_getValue(getProfileStorageKey(), {});
    const profileList = document
      .getElementById("profiles-list")
      .querySelector("div"); // 获取包装器

    if (!profileList) return;

    const profileElems = profileList.querySelectorAll(
      ".cookie-manager-profile"
    );

    if (!query.trim()) {
      // 如果搜索框为空，显示所有配置
      profileElems.forEach((elem) => {
        elem.style.display = "flex";
        // 移除任何高亮
        const nameElem = elem.querySelector(
          ".cookie-manager-profile-info div:first-child"
        );
        nameElem.innerHTML = nameElem.textContent;
      });
      return;
    }

    // 转换为小写以进行不区分大小写的搜索
    const lowerQuery = query.trim().toLowerCase();

    // 遍历所有配置元素
    profileElems.forEach((elem) => {
      const nameElem = elem.querySelector(
        ".cookie-manager-profile-info div:first-child"
      );
      const name = nameElem.textContent;

      if (name.toLowerCase().includes(lowerQuery)) {
        // 显示匹配的配置
        elem.style.display = "flex";

        // 高亮匹配文本
        const regex = new RegExp(`(${escapeRegExp(query.trim())})`, "gi");
        nameElem.innerHTML = name.replace(
          regex,
          '<span class="highlight">$1</span>'
        );
      } else {
        // 隐藏不匹配的配置
        elem.style.display = "none";
      }
    });
  }

  function renameProfile(oldName) {
    try {
      // 设置标记表示正在处理对话框，防止点击事件关闭面板
      window.isHandlingDialog = true;

      // 获取所有配置
      const profiles = GM_getValue(getProfileStorageKey(), {});

      // 确保配置存在
      if (!profiles[oldName]) {
        showNotification("找不到该配置", "error");
        window.isHandlingDialog = false;
        return;
      }

      // 弹出对话框获取新名称
      const newName = prompt("请输入新的配置名称", oldName);

      // 对话框处理完毕，移除标记
      setTimeout(() => {
        window.isHandlingDialog = false;
      }, 100);

      // 取消操作或没有输入
      if (!newName || newName.trim() === "") {
        return;
      }

      // 检查新名称是否已存在
      if (newName !== oldName && profiles[newName]) {
        // 再次设置标记处理确认对话框
        window.isHandlingDialog = true;
        const shouldOverwrite = confirm(`配置"${newName}"已存在，是否覆盖？`);
        setTimeout(() => {
          window.isHandlingDialog = false;
        }, 100);

        if (!shouldOverwrite) {
          return;
        }
      }

      // 复制配置到新名称
      profiles[newName] = { ...profiles[oldName] };

      // 如果新旧名称不同，删除旧配置
      if (newName !== oldName) {
        delete profiles[oldName];
      }

      // 保存更新后的配置
      GM_setValue(getProfileStorageKey(), profiles);

      // 更新配置列表
      loadProfiles();

      showNotification(`配置已重命名为"${newName}"`, "success");
    } catch (e) {
      // 发生错误时也移除标记
      window.isHandlingDialog = false;
      showNotification(`重命名配置失败: ${e.message}`, "error");
    }
  }

  // 从导入数据创建配置
  async function importAsProfile() {
    try {
      // 设置标记表示正在处理对话框，防止点击事件关闭面板
      window.isHandlingDialog = true;

      const importFormat = document.getElementById("import-format").value;
      const inputData = document.getElementById("import-data").value.trim();

      if (!inputData) {
        showNotification("请先输入要导入的数据", "error");
        window.isHandlingDialog = false;
        return;
      }

      // 弹出对话框获取配置名称
      const profileName = prompt("请输入配置名称");

      // 对话框处理完毕，移除标记
      setTimeout(() => {
        window.isHandlingDialog = false;
      }, 100);

      if (!profileName || !profileName.trim()) return;

      let data;

      // 根据导入格式解析数据
      if (importFormat === "auto") {
        // 尝试自动检测格式
        try {
          // 尝试解析为JSON
          data = JSON.parse(inputData);

          // 判断是否为Cookie-Editor格式
          if (
            Array.isArray(data) &&
            data.length > 0 &&
            data[0].name &&
            data[0].domain
          ) {
            // Cookie-Editor格式，只有cookies
            const cookies = data;
            const storage = {}; // 空storage
            saveProfileData(profileName, cookies, storage);
            return;
          } else if (data.cookies && data.storage) {
            // 完整JSON格式
            saveProfileData(profileName, data.cookies, data.storage);
            return;
          }
        } catch (e) {
          // 尝试Base64解码
          try {
            const base64Decoded = atob(inputData);
            // 将二进制字符串转换回UTF-8字节数组
            const utf8Bytes = new Uint8Array(
              base64Decoded.split("").map((c) => c.charCodeAt(0))
            );
            // 将UTF-8字节数组转换为字符串
            const jsonString = new TextDecoder().decode(utf8Bytes);
            data = JSON.parse(jsonString);

            if (data.cookies && data.storage) {
              saveProfileData(profileName, data.cookies, data.storage);
              return;
            }
          } catch (e2) {
            showNotification("无法解析输入数据，请指定正确的格式", "error");
            return;
          }
        }
      } else if (importFormat === "cookie-editor") {
        try {
          // Cookie-Editor格式
          const cookies = JSON.parse(inputData);
          const storage = {}; // 空storage
          saveProfileData(profileName, cookies, storage);
        } catch (e) {
          showNotification("解析Cookie-Editor格式失败", "error");
        }
      } else if (importFormat === "json") {
        try {
          // JSON格式
          data = JSON.parse(inputData);
          saveProfileData(profileName, data.cookies, data.storage);
        } catch (e) {
          showNotification("JSON解析失败", "error");
        }
      } else if (importFormat === "base64") {
        try {
          // Base64格式
          const base64Decoded = atob(inputData);
          // 将二进制字符串转换回UTF-8字节数组
          const utf8Bytes = new Uint8Array(
            base64Decoded.split("").map((c) => c.charCodeAt(0))
          );
          // 将UTF-8字节数组转换为字符串
          const jsonString = new TextDecoder().decode(utf8Bytes);
          data = JSON.parse(jsonString);
          saveProfileData(profileName, data.cookies, data.storage);
        } catch (e) {
          showNotification("Base64解码失败", "error");
        }
      }
    } catch (e) {
      // 发生错误时也移除标记
      window.isHandlingDialog = false;
      showNotification("创建配置失败: " + e.message, "error");
    }
  }

  // 保存配置数据通用方法
  function saveProfileData(profileName, cookies, storage) {
    // 获取现有配置
    const profiles = GM_getValue(getProfileStorageKey(), {});

    // 检查重名
    if (
      profiles[profileName] &&
      !confirm(`配置"${profileName}"已存在，是否覆盖？`)
    ) {
      return;
    }

    // 添加新配置
    profiles[profileName] = {
      date: new Date().toISOString(),
      cookies: cookies,
      storage: storage,
    };

    // 保存配置
    GM_setValue(getProfileStorageKey(), profiles);

    // 更新配置列表
    loadProfiles();

    // 切换到配置管理标签
    document.querySelector('.cookie-manager-tab[data-tab="profiles"]').click();

    showNotification(`配置"${profileName}"保存成功`, "success");
  }

  // 导出单个配置
  function exportProfile(name, profile) {
    // 创建导出数据
    const exportData = {
      cookies: profile.cookies,
      storage: profile.storage,
    };

    // 切换到导出标签
    document.querySelector('.cookie-manager-tab[data-tab="export"]').click();

    // 设置导出格式为JSON
    document.getElementById("export-format").value = "json";

    // 显示导出数据
    document.getElementById("export-data").value = JSON.stringify(
      exportData,
      null,
      4
    );

    showNotification(`配置"${name}"已导出`, "success");
  }

  // 使元素可拖动
  function makeDraggable(element, handle = null) {
    const dragHandle = handle || element;
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    dragHandle.addEventListener("mousedown", (e) => {
      // 只有当拖动区域被点击时才触发
      if (e.target.closest("#cookie-manager-close")) {
        return; // 如果点击了关闭按钮，不启动拖动
      }

      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;

      const rect = element.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    function onMouseMove(e) {
      // 一旦移动就标记为拖动状态
      isDragging = true;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const newLeft = startLeft + dx;
      const newTop = startTop + dy;

      // 确保图标不会移出视口
      const maxX = window.innerWidth - element.offsetWidth;
      const maxY = window.innerHeight - element.offsetHeight;

      element.style.left = `${Math.max(0, Math.min(newLeft, maxX))}px`;
      element.style.top = `${Math.max(0, Math.min(newTop, maxY))}px`;
    }

    function onMouseUp(e) {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      if (isDragging) {
        // 如果是拖动，保存位置
        const position = {
          left: parseInt(element.style.left) || 0,
          top: parseInt(element.style.top) || 0,
        };
        GM_setValue("cookieIconPosition", position);
      } else {
        // 如果不是拖动，则是点击，触发面板切换
        togglePanel();
      }
    }
  }

  // 转义正则表达式特殊字符
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // 显示通知
  function showNotification(message, type = "info") {
    let notification = document.querySelector(".cookie-manager-notification");

    if (!notification) {
      notification = document.createElement("div");
      notification.className = "cookie-manager-notification";
      document.body.appendChild(notification);
    }

    // 清除所有类型类
    notification.classList.remove(
      "cookie-manager-info",
      "cookie-manager-success",
      "cookie-manager-error",
      "cookie-manager-show"
    );

    // 添加新类型和显示类
    notification.classList.add(`cookie-manager-${type}`, "cookie-manager-show");
    notification.textContent = message;

    // 3秒后隐藏通知
    setTimeout(() => {
      notification.classList.remove("cookie-manager-show");
    }, 3000);
  }

  // 初始化
  function init() {
    // 等待DOM加载完成
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", createUI);
    } else {
      createUI();
    }
  }

  // 注册菜单命令
  GM_registerMenuCommand("饼干盒子", togglePanel);

  // 启动脚本
  init();
})();
