(function () {
	let subleagueName, $teams, state, coachIds;
	let year = `2021`;
	let coachStats = [];
//	let leagueTeams = [];
	let currentRound = findCurrentRound();
	let currentPage = determineCurrentPage();
	
	function createStateObject(){
		state[subleagueName] = {};

		state[`${subleagueName}-pointDifference`] = {};
		state[`${subleagueName}-previousPoints`] = {};

		coachIds.forEach(coachId => {
			state[subleagueName][coachId] = {};
			state[`${subleagueName}-pointDifference`][coachId] = 0;
			state[`${subleagueName}-previousPoints`][coachId] = 0;

			for(let i = 1; i<=34; i++) {
				state[subleagueName][coachId][i] = [];
			}
		});
	}

	function determineCurrentPage(){
		if(Number.isInteger(currentRound)) return `teamOverview`;
		else return `teamOverviewAdmin`;
	}

	function processAdminSettings(){
		let $tags = $(`tr[role="row"] td:nth-child(4)`);
		let description =  $(`.description`).text();
		let lowestScores = description.match(/==<(.*)>==/g);
		let highestScores = description.match(/=={(.*)}==/g);
	//	let champions = description.match(/==\|(.*)\|==/g);
	//	let highestScorePreviousYears = description.match(/===(.*)===/g);
	//	let periodWinners = description.match(/==;(.*);==/g);
		
		if(lowestScores) {
			lowestScores.forEach(name => {
				let coachName = name.replace(`==<`, ``).replace(`>==`, ``);

				$tags.each(function(){
					let $this = $(this);

					if ($this.text() === coachName) {
						$this.closest(`tr`).addClass(`lowest`);
					}
				});
			});
		}

		if(highestScores) {
			highestScores.forEach(name => {
				let coachName = name.replace(`=={`, ``).replace(`}==`, ``);

				$tags.each(function(){
					let $this = $(this);
					
					if ($this.text() === coachName) {
						$this.closest(`tr`).addClass(`highest`);
					}
				});
			});
		}

	/*	if(champions) {
			champions.forEach(champ => {
				let coachName = champ.replace(`==|`, ``).replace(`|==`, ``);

				$tags.each(function(){
					let $this = $(this);
					
					if ($this.text() === coachName) {
						$this.closest(`tr`).find(`.achievements`)
							.append(`<i class="fa fa-trophy champion" title="Kampioen"></i>`);
					}
				});
			});
		}

		if(highestScorePreviousYears) {
			highestScorePreviousYears.forEach(champ => {
				let coachName = champ.replace(`==|`, ``).replace(`|==`, ``);

				$tags.each(function(){
					let $this = $(this);
					
					if ($this.text() === coachName) {
						$this.closest(`tr`).find(`.achievements`)
							.append(`<i class="fa fa-circle period-winner" title="Periode winnaar"></i>`);
					}
				});
			});
		}

		if(periodWinners) {
			periodWinners.forEach(champ => {
				let coachName = champ.replace(`==|`, ``).replace(`|==`, ``);

				$tags.each(function(){
					let $this = $(this);
					
					if ($this.text() === coachName) {
						$this.closest(`tr`).find(`.achievements`)
							.append(`<i class="fa fa-bolt highest-score" title="Hoogste rondescore"></i>`);
					}
				});
			});
		}*/
 		
		let descriptionHTML = $(`.description`).html();
		
		descriptionHTML = descriptionHTML
			.replace(/=={.*?}==/g, '')	
			.replace(/==\|.*?\|==/g, '')
			.replace(/===.*?===/g, '')
			.replace(/==;*?==;/g, '')
			.replace(/==&lt;.*?&gt;==/g, '');
		
		$(".description").html(descriptionHTML);
	}
	
	function getPlayerTeams(){
		coachIds.forEach(coachId => {
			let coach = state[subleagueName][coachId];

			for(let i = 1; i <= currentRound; i++) {
				let round = coach[i];

				if(round.length < 15) { // Zijn alle spelers in een ronde al bekend? dan hoeft er niets gedownload te worden
					$.ajax({
						url: `/team/${coachId}/${i}`
					})
					.success(function(data) {
						let $page = $(data);
						
						$page.find(`.content .name`).each(function(){
							round.push(this.innerText);
						});
					});
				} 
			}
		});
		
		$.ajax({url: ``}); // Trigger the ajaxStop function no matter what happens
	}

	function getPlayerScores(){
		coachIds.forEach(coachId => {
			let $currentPoints = $(`.team a`)
				.filter(`[href="/team/${coachId}"]`)
				.closest(`tr`)
				.find(`td:nth-of-type(7)`);
			let currentPoints = parseInt($currentPoints.text());
			let previousPoints = state[`${subleagueName}-previousPoints`][coachId] || 0;
			let difference = currentPoints - previousPoints;
			let quantifier = difference >= 0 ? `+` : ``;
			let trendClassName;
			
			if(difference > 0) trendClassName = `positive`;
			else if(difference < 0) trendClassName = `negative`;

			state[`${subleagueName}-pointDifference`][coachId] = difference;
			state[`${subleagueName}-previousPoints`][coachId] = currentPoints;
			$currentPoints.append(`<span class="${trendClassName}">(${quantifier}${difference})</span>`);
		});
	}
	
	function showTransfersInUI(){
		coachIds.forEach(coachId => {
			let playersIn, playersOut;
			let playersInHTML = ``;
			let playersOutHTML = ``;
			let coach = state[subleagueName][coachId];
			let thisRoundSquad = coach[currentRound];
			let lastRoundSquad = coach[currentRound - 1];
			let $playerRow = 
				$(`.team a`)
					.filter(`[href="/team/${coachId}"]`)
					.closest(`tr`)
					.find(`td:nth-of-type(3)`);
					
			playersIn = thisRoundSquad.differenceWith(lastRoundSquad);
			playersOut = lastRoundSquad.differenceWith(thisRoundSquad);
			playersIn.forEach(player => playersInHTML += `<p>In: ${player}</p>`);
			playersOut.forEach(player => playersOutHTML += `<p>Uit: ${player}</p>`);
					
			$playerRow.find(`.transfers`).remove();
			$playerRow.append(`<div class="transfers">
					<div class="in">
						${playersInHTML}
					</div>
					<div class="out">
						${playersOutHTML}
					</div>
				</div>`);
		});

		saveDataInLocalstorage();
	}

	function saveDataInLocalstorage(){
		chrome.storage.local.set({[`${subleagueName}-${year}`]: state[subleagueName]});
		chrome.storage.local.set({[`${subleagueName}-${year}-previousPoints`]: state[`${subleagueName}-previousPoints`]});
	}

	function findCurrentRound(){
		let round = parseInt($(`#dropdownMenu2`).text().replace(`t/m Ronde`, ``));
		return isNaN(round) ? 0 : round;
	}

	function loadLocalStorageState(){
	/*	chrome.storage.local.clear(function() {
			var error = chrome.runtime.lastError;
			if (error) {
				console.error(error);
			}
		});*/

		chrome.storage.local.get([`${subleagueName}-${year}`], function(result) {
			state[subleagueName] = $.extend(state[subleagueName], result[[subleagueName]]);	

			getPlayerTeams();
		});

		chrome.storage.local.get([`${subleagueName}-${year}-previousPoints`], function(result) {
			state[`${subleagueName}-previousPoints`] = $.extend(state[`${subleagueName}-previousPoints`], result[[`${subleagueName}-previousPoints`]]);	
			
			getPlayerScores();
		});
	}

	function setEvents(){
		$(document).unbind(`ajaxStop`).ajaxStop(function() {
			showTransfersInUI();
			fillCoachStatsScreen();
		});

		$(`.paginate_button`).on(`click`, () => {
			initialize(false);
		});
	}

	function addSearchFunction(){
		$(`.search-area > div > div`).append(`
			<div class="search">
				<div id="subleague-ranking-table_filter" class="dataTables_filter">
					<label>
						<input type="search" id="search-player" placeholder="Speler vergelijken...">
					</label>
				</div>
			</div>
		`);

		$(`body`).on(`change`, `#search-player`, findCoachesWithPlayerInSquad);
	}

	function findCoachesWithPlayerInSquad(){
		let searchedPlayer = $(this).val();
		$(`.has-player-in-team`).removeClass(`has-player-in-team`);

		coachIds.forEach(coachId => {
			let coach = state[subleagueName][coachId];
			let thisRoundSquad = coach[currentRound];
			let mathchFound = thisRoundSquad.map((a) => { 
				return a.toSimpleStr() 
			}).includes(searchedPlayer.toSimpleStr());

			if(mathchFound) {
				$(`.team a`)
					.filter(`[href="/team/${coachId}"]`)
					.closest(`tr`)
					.addClass(`has-player-in-team`);
			}
		});
	}

	function findCoachIds(){		
		$teams.each(function() {
			let teamId = parseInt($(this).attr(`href`).replace(`/team/`, ``));
			coachIds.push(teamId);
		});
	}

	function createStatisticsScreen(getNewStats = true){
		$(`.statistics-screen`).remove();
		$(`body`).append(`
			<div class="statistics-screen">
				<div class="leave-exit-screen-icon">
					<i class="fa fa-times"></i>
				</div>	
				<table>
					<thead>
						<th>Coach</th>
						<th prop-name="goalAmt">Doelpunten</th>
						<th prop-name="goals">Doelpunten punten</th>
						<th prop-name="cardAmt">Kaarten</th>
						<th prop-name="cards">Kaarten punten</th>
					</thead>
					<tbody class="statistics-body">
						
					</tbody>
				</table>
			</div>
		`);

		$(`.leave-exit-screen-icon`).off(`click`).on(`click`, function(){
			$(`.statistics-screen`).remove();
		});

		$(`.statistics-screen th:not(:first-of-type)`).off(`click`).on(`click`, function(){
			let propName = $(this).attr(`prop-name`);
			
			coachStats.sort((a,b)=> (a[propName] < b[propName] ? 1 : -1));

			createStatisticsScreen(false);
		});

		if(getNewStats) getCoachStats();
		else fillCoachStatsScreen();
	}

	function getCoachStats(){
		let $rankingTable = $(`#subleague-ranking-table`);
		
		coachIds.forEach((coachId, index) => {
			coachStats[index] = {
				coach: $rankingTable.find(`a[href="/team/${coachId}"]`).text(),
				goals: 0,
				cards: 0,
				goalAmt: 0,
				cardAmt: 0
			};

			for(let i = 1; i <= currentRound; i++) {
				$.ajax({
					url: `/team/${coachId}/${i}`
				})
				.success(function(data) {
					let $page = $(data);
					
					let yellowCard = $page.find(`.ico.BY .minus`);
					let secondYellowCard = $page.find(`ico BSY .minus`);
					let redCard = $page.find(`.ico.BR .minus`);
					let allYellowcards = $.merge(yellowCard, secondYellowCard);
					let allCards = $.merge(allYellowcards, redCard);
					let cardPoints = 0; 
					let cardAmt = 0;
					
					allCards.each(function(){
						cardPoints += parseInt($(this).text());
						cardAmt++;
					});
					
					coachStats[index].cards += cardPoints;
					coachStats[index].cardAmt += cardAmt;

					let goal = $page.find(`.ico.G .plus`);
					let penalty = $page.find(`.ico.GP .plus`);
					let allGoals = $.merge(goal, penalty);
					let goalPoints = 0; 
					let goalAmt = 0;
					
					allGoals.each(function(){
						goalPoints += parseInt($(this).text());
						goalAmt++;
					});

					coachStats[index].goals += goalPoints;
					coachStats[index].goalAmt += goalAmt;
				});
			}
		});
	}
	
	function fillCoachStatsScreen(){
		let $statisticsBody = $(`.statistics-body`);
		
		coachStats.forEach(coach => {
			$statisticsBody.append(`
				<tr>
					<td>${coach.coach}</td>
					<td>${coach.goalAmt}</td>
					<td>${coach.goals}</td>
					<td>${coach.cardAmt}</td>
					<td>${coach.cards}</td>
				</tr>
			`);
		});
	}

	function addStatisticsIcon(){
		$(`div.subleague-header`).append(`<i class="fa fa-list-ol list-icon"></i>`);

		$(`.list-icon`).on(`click`, () => {
			if($(`.statistics-screen`).length === 0) createStatisticsScreen();
		});
	}

	function initialize(firstTime){
		$teams = $(".leagues-table .team > a");
		state = {};
		coachIds = [];
		
		subleagueName = $(`.subleague-header h2`).text().replace(`(Beheerder)`, ``).trim();
		$(`body`).attr(`subleague`, subleagueName); 
		
		findCoachIds();
		createStateObject();
		processAdminSettings();
	
		if(currentRound > 1) {
			if(firstTime === true) {
				addSearchFunction();
			}
			
			setEvents();
			loadLocalStorageState();
			addStatisticsIcon();
		//	teamSelectbox.ini();
		}
	}
	
	if(currentPage === `teamOverview`) {
		let pageLoadedInterval = setInterval(function() {
			if($(`#subleague-ranking-table tr`).length > 2) {
				clearInterval(pageLoadedInterval);
				initialize(true);
			}
		}, 500);
	}
/*
	function TeamSelectbox(){
		this.createSelectbox = function($page) {
			let optionsHTML = ``;
			
			$page.find(`.fullname`).each(function(){ 
				let team = $(this).text();

				leagueTeams.push(team);
				optionsHTML += `<option value="${team}">${team}</option>`
			});
			
			$(`.dropdown-wrapper`).append(
				`<div class="dropdown league-subheader">
					<select class="dropdown-menu teams-dropdown">
						<option value="">Geen team geselecteerd</option>
						${optionsHTML}
					</select>
				</div>`
			);
		}

		this.ini = function(){
			this.findTeams();
		}

		this.findTeams = function(){
			$.ajax({
				url: `/team/${coachIds[0]}/${1}`
			})
			.success(data => {
				let $page = $(data);
				
				this.createSelectbox($page);
			});
		}
	}*/
})();

Array.prototype.differenceWith = function(a) {
    return this.filter(function(i) {return a.indexOf(i) < 0;});
};

String.prototype.toSimpleStr = function() {
	return this.toLowerCase().normalize(`NFD`).replace(/[\u0300-\u036f]/g, '');
}