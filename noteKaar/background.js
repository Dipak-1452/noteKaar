// Handle keyboard shortcut (C+N or custom shortcut)
chrome.commands.onCommand.addListener((command) => {
    if (command === "create_note") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "create_note" });
        });
    }
});

// Create right-click context menu
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "create_sticky_note",
        title: "📝 Create Sticky Note",
        contexts: ["all"]
    });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "create_sticky_note") {
        chrome.tabs.sendMessage(tab.id, { action: "create_note" });
    }
});


  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "open_dashboard") {
      const dashboardUrl = chrome.runtime.getURL("dashboard.html");
  
      chrome.tabs.query({}, (tabs) => {
        const existingTab = tabs.find(tab => tab.url === dashboardUrl);
  
        if (existingTab) {
            chrome.tabs.reload(existingTab.id, () => {
                chrome.tabs.update(existingTab.id, { active: true });
              });
        } else {
          chrome.tabs.create({ url: dashboardUrl });
        }
      });
    }
  });
  
  