// Extract team number from the URL
function getTeamFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("team");
}

const TBA_OPTS = {
  headers: {
    "X-TBA-Auth-Key": "fR7qLuvjYf4CcOQRmcd0veCMGUFQClJXW6kbTreFtbqgEPSJwdTSbhnXB3s61QBj",
  },
};

const TBA_BASE_URL = "https://www.thebluealliance.com/api/v3";
const SB_BASE_URL = "https://api.statbotics.io/v3";
let SBData = {};

const table = document.getElementById("table-body");
const input = document.getElementById("guesser");

let guessed = [];
let guesses = 0;
let hiddenTeam;
let banners = 0;
let teamNumber = getTeamFromURL();
let attendedTeams = new Set();

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
        fetchBanners(hiddenTeam).then((b) => (banners = b));
        populateTeams(SBData);
      });
    } else {
      console.log("Teams in localStorage, reading...");
      SBData = new Map();
      teams = JSON.parse(localStorage.getItem("sb_teams"));
      teams.forEach((entry) => SBData.set(entry[0], entry[1]));
      teams = SBData.keys().toArray();
      hiddenTeam = pickTeam(teams);
      populateTeams(SBData);
      fetchBanners(hiddenTeam).then((b) => (banners = b));
      console.log("Teams have been read!");
    }
  } else {
    console.log("Fetching teams...");
    localStorage.setItem("sb_timestamp", Date.now());
    fetchSBData().then((map) => {
      SBData = map;
      var teams = map.keys().toArray();
      hiddenTeam = pickTeam(teams);
      fetchBanners(hiddenTeam).then((b) => (banners = b));
      populateTeams(SBData);
    });
  }

  if (!teamNumber) {
    console.log("No team number specified in the URL. Running default behavior.");
  } else {
    console.log(`Fetching events for team ${teamNumber} in 2024...`);

    // Fetch events the team attended in 2024
    fetch(`${TBA_BASE_URL}/team/frc${teamNumber}/events/2024`, TBA_OPTS)
      .then((rsp) => (rsp.ok ? rsp.json() : Promise.reject("Failed to fetch events")))
      .then((events) => {
        const eventKeys = events.map((event) => event.key);
        console.log(`Team ${teamNumber} attended events:`, eventKeys);
        return fetchTeamsAtEvents(eventKeys);
      })
      .then((teams) => {
        attendedTeams = teams;
        console.log("Teams at the events attended by team", teamNumber, teams);
        hiddenTeam = pickTeam(Array.from(attendedTeams));
        populateTeams(attendedTeams);
      })
      .catch((error) => console.error(error));
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
  if (attendedTeams.size > 0) {
    const sortedTeams = Array.from(attendedTeams).sort();
    sortedTeams.forEach((team) => {
      let element = document.createElement("option");
      element.value = team;
      document.getElementById("teams").appendChild(element);
    });
    console.log("Teams have been populated based on events attended!");
  } else {
    const teams = Array.from(SBData.keys()).sort();
    teams.forEach((team) => {
      let element = document.createElement("option");
      element.value = team;
      document.getElementById("teams").appendChild(element);
    });
    console.log("Teams have been populated with all teams!");
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && input.value !== "") {
    guess(input.value);
    input.value = "";
  }
});

function pickTeam(teams) {
  const idx = Math.floor(Math.random() * teams.length);
  return teams[idx];
}

function guess(number) {
  if (SBData) {
    if (
      (attendedTeams.size === 0 || attendedTeams.has(number)) &&
      guessed.indexOf(number) === -1
    ) {
      if (number == hiddenTeam) {
        setTimeout(celebrate, 500);
      }
      guesses += 1;
      guessed.push(number);
      fetchBanners(number).then((banners) =>
        table.insertBefore(
          buildTableRow([number, banners]),
          table.firstChild
        )
      );

      input.value = "";
    } else {
      if (guessed.indexOf(number) !== -1) {
        alert(`Team ${number} has already been guessed!`);
      } else {
        alert(
          attendedTeams.size > 0
            ? `Team ${number} did not attend the same events as team ${teamNumber}.`
            : `Team ${number} does not exist, or did not compete in the ${tba.current_season} season`
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

  awards = await fetch(`${TBA_BASE_URL}/team/frc${number}/awards`, TBA_OPTS)
    .then((rsp) => (rsp.ok ? rsp.json() : null))
    .catch((err) => {
      console.error(`Error fetching awards for team ${number}:`, err);
      return [];
    });

  return awards.filter((award) => award.award_type == 1).length;
}

function buildTableRow(data) {
  const tr = document.createElement("tr");

  data.forEach((value) => {
    const td = document.createElement("td");
    td.textContent = value;
    tr.appendChild(td);
  });

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

async function fetchTeamsAtEvents(eventKeys) {
  const teamSet = new Set();

  for (const eventKey of eventKeys) {
    const teams = await fetch(`${TBA_BASE_URL}/event/${eventKey}/teams`, TBA_OPTS)
      .then((rsp) => (rsp.ok ? rsp.json() : []))
      .catch((err) => {
        console.error(`Error fetching teams for event ${eventKey}:`, err);
        return [];
      });

    teams.forEach((team) => teamSet.add(team.team_number.toString()));
  }

  return teamSet;
}

function cleanCache() {
  localStorage.removeItem("sb_teams");
  localStorage.removeItem("sb_timestamp");
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function celebrate() {
  const duration = 7 * 1000,
    animationEnd = Date.now() + duration,
    defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
