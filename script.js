const TBA_OPTS = {
  headers: {
    "X-TBA-Auth-Key":
      "fR7qLuvjYf4CcOQRmcd0veCMGUFQClJXW6kbTreFtbqgEPSJwdTSbhnXB3s61QBj",
  },
};

const TBA_BASE_URL = "https://www.thebluealliance.com/api/v3";
const SB_BASE_URL = "https://api.statbotics.io/v3";

var tba;

const table = document.getElementById("table-body");

var preloaded = [];
var guessed = [];

teamData = {};

window.onload = function () {
  fetch(`${TBA_BASE_URL}/status`, TBA_OPTS)
    .then((rsp) => rsp.json())
    .then((json) => tbaStatus(json));
};

function tbaStatus(json) {
  tba = json;

  if (tba.is_datafeed_down == true) {
    alert("TBA is currently down!");
  }
}

function readTeamData(preload, number) {
  if (guessed.indexOf(number) != -1) {
    // has been guessed
  } else {
    if (preload) {
      fetchTeam(number).then((data) => preloaded.push({ data }));
    } else {
      fetchTeam(number).then((data) => table.appendChild(buildTableRow(data)));
    }
  }
}

async function fetchTeamData(number) {
  let simple = null;
  let awards = null;
  let rank = null;

  if (parseInt(number) <= 0 || parseInt(number) > 15000) {
    // Handle invalid team number here, if needed
    alert(`Team ${number} does not exist!`);
    return null;
  }

  // Fetch team info
  simple = await fetch(`${TBA_BASE_URL}/team/frc${number}`, TBA_OPTS).then(
    (rsp) => (rsp.ok ? rsp.json() : null)
  );

  // Fetch awards info
  awards = await fetch(
    `${TBA_BASE_URL}/team/frc${number}/awards`,
    TBA_OPTS
  ).then((rsp) => (rsp.ok ? rsp.json() : null));

  rank = await fetch(
    `${SB_BASE_URL}/team_year/${number}/${tba.current_season}`
  ).then((rsp) => (rsp.ok ? rsp.json() : null));

  if (simple && awards && rank) {
    console.log(awards.filter((award) => award.award_number == 1).length);
    return [
      simple.team_number,
      simple.country,
      awards.filter((award) => award.award_type == 1).length, // Banners
      rank.epa.ranks.total.rank,
      simple.rookie_year,
    ];
  } else {
    alert(`Team ${number} does not exist!`);
    return null;
  }
}

function buildTableRow(data) {
  var tr = document.createElement("tr");
  console.log(data);

  for (i = 0; i < data.length; ++i) {
    td = document.createElement("td");
    td.innerHTML = data[i];
    console.log(data[i]);
    tr.appendChild(td);
  }

  return tr;
}

async function fetchRanks() {
  teams = await Promise.all([
    fetch(`${SB_BASE_URL}/teams?active=true&offset=0`),
    fetch(`${SB_BASE_URL}/teams?active=true&offset=1000`),
    fetch(`${SB_BASE_URL}/teams?active=true&offset=2000`),
    fetch(`${SB_BASE_URL}/teams?active=true&offset=3000`),
  ]);

  console.log(teams);

  teamMap = new Map();

  teams.forEach((rsp) =>
    console.log(rsp.json().then((json) => json.values().forEach((team) => teamMap.set(team.team, team))))
    // rsp.json.values().forEach((team) => teamStats.push({ team }))
  );


  return teamMap;
}
