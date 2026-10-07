console.log("background.js loaded");

browser.action.onClicked.addListener(() => {
  console.log("Action button clicked");
  browser.sidebarAction.toggle();
});
