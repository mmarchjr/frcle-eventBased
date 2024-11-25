const TBA_OPTS = {
  headers: {
    "X-TBA-Auth-Key":
      "fR7qLuvjYf4CcOQRmcd0veCMGUFQClJXW6kbTreFtbqgEPSJwdTSbhnXB3s61QBj",
  },
};

const TBA_BASE_URL = "https://www.thebluealliance.com/api/v3";
const SB_BASE_URL = "https://api.statbotics.io/v3";

var tba;
SBData = {};

const table = document.getElementById("table-body");
const input = document.getElementById("guesser");

var guessed = [];
var guesses = 0;
var hiddenTeam;
var banners = 0;

window.onload = async function () {
  fetch(`${TBA_BASE_URL}/status`, TBA_OPTS)
    .then((rsp) => rsp.json())
    .then((json) => tbaStatus(json));

  // Atomic data, it is more than a day old, we request for new data
  if (localStorage.getItem("sb_timestamp") != null) {
    if (Date.now() - localStorage.getItem("sb_timestamp") > 8.64e7) {
      console.log("Teams oudated, fetching");
      localStorage.setItem("sb_timestamp", Date.now());
      fetchSBData().then((map) => {
        SBData = map;
        var teams = map.keys().toArray();
        hiddenTeam = pickTeam(teams);
        teams.forEach((entry) => SBData.set(entry[0], entry[1]));
        populateTeams(SBData);
        fetchBanners(hiddenTeam).then((b) => banners = b);
      });
    } else {
      console.log("Teams in localStorage, reading...");
      SBData = new Map();
      teams = JSON.parse(localStorage.getItem("sb_teams"));
      teams.forEach((entry) => SBData.set(entry[0], entry[1]));
      teams = SBData.keys().toArray();
      hiddenTeam = pickTeam(teams);
      populateTeams(SBData);
      fetchBanners(hiddenTeam).then((b) => banners = b);
      console.log("Teams have been read!");
    }
  } else {
    console.log("Fetching teams...");
    localStorage.setItem("sb_timestamp", Date.now());
    fetchSBData().then((map) => {
      SBData = map;
      var teams = map.keys().toArray();
      hiddenTeam = pickTeam(teams);
      fetchBanners(hiddenTeam).then((b) => banners = b);
      populateTeams(SBData);
    });
  }
};

window.addEventListener("beforeunload", (event) => {
  //   event.preventDefault();
  if (SBData) {
    localStorage.setItem("sb_teams", JSON.stringify([...SBData]));
  } else {
    cleanCache();
  }
});

function populateTeams(SBData) {
  var teams = Array.from(SBData.keys()).sort();
  hiddenTeam = pickTeam(teams);
  teams.forEach((team) => {
    let element = document.createElement("option");
    element.value = team;
    document.getElementById("teams").appendChild(element);
  });
  console.log("Teams have been populated!");
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && guesser.value != "") {
    guess(guesser.value);
    guesser.value = "";
  }
});

function pickTeam(teams) {
  idx = Math.random() * teams.length;
  return teams.at(idx);
}

function guess(number) {
  if (SBData) {
    if (SBData.get(number) && guessed.indexOf(number) == -1) {
      guesses += 1;
      guessed.push(number);
      teamData = SBData.get(number);
      fetchBanners(number).then((banners) =>
        table.insertBefore(
          buildTableRow([
            teamData.team,
            teamData.name,
            teamData.country,
            banners,
            teamData.norm_epa.current,
            teamData.rookie_year,
          ]),
          table.firstChild
        )
      );

      guesser.value = "";
    } else {
      if (guessed.indexOf(number) != -1) {
        alert(`Team ${number} has already been guessed!`);
      } else {
        alert(
          `Team ${number} does not exist, or did not compete in the ${tba.current_season} season`
        );
      }
    }
  } else {
    alert("Currently fetching data, try again momentarily!");
  }
}

function tbaStatus(json) {
  tba = json;

  if (tba.is_datafeed_down == true) {
    alert("TBA is currently down!");
  }
}

async function fetchBanners(number) {
  let awards = null;

  // Fetch awards info
  awards = await fetch(
    `${TBA_BASE_URL}/team/frc${number}/awards`,
    TBA_OPTS
  ).then((rsp) => (rsp.ok ? rsp.json() : null));

  console.log(awards.filter((award) => award.award_number == 1).length);
  return awards.filter((award) => award.award_type == 1).length;
}

function buildTableRow(data) {
  var tr = document.createElement("tr");

  sb_array = SBData.get(hiddenTeam);
  sb_data = [
    sb_array.team,
    null,
    sb_array.country,
    banners,
    sb_array.norm_epa.current,
    sb_array.rookie_year,
  ];

  for (i = 0; i < data.length; ++i) {
    td = document.createElement("td");
    icon = document.createElement("i");
    td.innerHTML = data[i];

    if ([0, 2, 3, 4, 5].indexOf(i) != -1) {
      if (i == 2) {
        if (data[i] != sb_data[i]) {
          td.classList.add("lower");
          icon.classList = "fa-solid fa-x";
        } else {
          td.classList.add("correct");
          icon.classList = "fa-solid fa-check";
        }
      } else {
        if (parseInt(data[i]) > parseInt(sb_data[i])) {
          td.classList.add("lower");
          icon.classList = "far fa-arrow-alt-circle-down";
        } else if (parseInt(data[i]) < parseInt(sb_data[i])) {
          td.classList.add("higher");
          icon.classList = "far fa-arrow-alt-circle-up";
        } else {
          td.classList.add("correct");
          icon.classList = "fa-solid fa-check";
        }
      }
    }

    td.appendChild(icon);
    tr.appendChild(td);
  }

  return tr;
}

async function fetchSBData() {
  teams = await Promise.all([
    fetch(`${SB_BASE_URL}/teams?active=true&offset=0`),
    fetch(`${SB_BASE_URL}/teams?active=true&offset=1000`),
    fetch(`${SB_BASE_URL}/teams?active=true&offset=2000`),
    fetch(`${SB_BASE_URL}/teams?active=true&offset=3000`),
  ]);

  console.log("Teams have been fetched!");

  teamMap = new Map();

  for (const rsp of teams) {
    if (rsp.ok) {
      const json = await rsp.json();
      json.forEach((team) => {
        teamMap.set(team.team, team);
      });
    } else {
      console.error(`Error fetching teams: ${rsp.statusText}`);
    }
  }

  console.log(teamMap);

  return teamMap;
}

function cleanCache() {
  localStorage.removeItem("sb_teams");
  localStorage.removeItem("sb_timestamp");
}
