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
let SBData = {};

const table = document.getElementById("table-body");
const input = document.getElementById("guesser");

let guessed = [];
let guesses = 0;
let hiddenTeam;
let banners = 0;
let teamNumber = getTeamFromURL();
let attendedTeams = new Set();

if (!teamNumber) {
  alert("No team number specified in the URL. Please use ?team={team_number}.");
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

// Fetch teams attending a list of event keys
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

function populateTeams(teams) {
  const sortedTeams = Array.from(teams).sort();
  pickTeam(sortedTeams);

  sortedTeams.forEach((team) => {
    let element = document.createElement("option");
    element.value = team;
    document.getElementById("teams").appendChild(element);
  });

  console.log("Teams have been populated!");
}

function pickTeam(teams) {
  const idx = Math.floor(Math.random() * teams.length);
  return teams[idx];
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && input.value !== "") {
    guess(input.value);
    input.value = "";
  }
});

function guess(number) {
  if (SBData) {
    if (attendedTeams.has(number) && guessed.indexOf(number) === -1) {
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
        alert(`Team ${number} did not attend the same events as team ${teamNumber}.`);
      }
    }
  } else {
    alert("Currently fetching data, try again momentarily!");
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
