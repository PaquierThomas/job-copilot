// const settings = document.querySelector("#settings");

// settings.addEventListener("click", () => {
//   browser.runtime.openOptionsPage();
// });

// async function loadData() {
//   const result = await browser.storage.local.get("user");

//   if (!result.user) {
//     return;
//   }

//   document.querySelector("#username").textContent =
//     result.user.username || "Utilisateur";

//   document.querySelector("#data-username").textContent =
//     result.user.username || "—";

//   document.querySelector("#data-avatar").textContent = result.user.avatar
//     ? "Importé"
//     : "—";
// }

// loadData();



const buttons = document.querySelectorAll("button[data-tab]") 
const sections = document.querySelectorAll("section[data-tab]")


buttons.forEach((button) => {
  button.addEventListener("click", () => {
    console.log("Action button clicked");
    console.log(button.dataset.tab);


    sections.forEach((section) => {
        section.hidden = true;
    });

    const targetSection = document.querySelector(
      `section[data-tab="${button.dataset.tab}"]`
    );
    if (targetSection) {
      targetSection.hidden = false;
    }
  });
});


const saveProfileButton = document.querySelector("#save-profile");

saveProfileButton.addEventListener("click", async () => {
    const profileData = document.querySelector("#profile-json").value;
    document.querySelector("#profile-json").value = profileData;
    browser.storage.local.set({ user: { username: profileData } });
    console.log("Profile data saved:", profileData);
});

const getProfileData = browser.storage.local.get("user").then((result) => {
    if (result.user) {
        document.querySelector("#profile-json").value = result.user.username || "";
        document.querySelector("#saved-username").textContent = result.user.username || "—";
    }
    console.log("Profile data loaded:", result.user);
});