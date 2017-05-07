$(".userInfo input").hover(function() {
	$(this).select();
	$(this).after("<input type='text' style='height:0;width:0;border:0;padding:0;margin:0;' id='tmp_hidden' />");
}, function() {
	$("#tmp_hidden").select().remove();
});

var QueryString = function() {
	// This function is anonymous, is executed immediately and
	// the return value is assigned to QueryString!
	var query_string = {};
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split("=");
		// If first entry with this name
		if (typeof query_string[pair[0]] === "undefined") {
			query_string[pair[0]] = decodeURIComponent(pair[1]);
			// If second entry with this name
		} else if (typeof query_string[pair[0]] === "string") {
			var arr = [query_string[pair[0]], decodeURIComponent(pair[1])];
			query_string[pair[0]] = arr;
			// If third or later entry with this name
		} else {
			query_string[pair[0]].push(decodeURIComponent(pair[1]));
		}
	}
	return query_string;
}();

var id = QueryString.id;
if (typeof id !== "undefined") {
	FindUser(id);
}

$("#search-form").submit(function() {
	if ($("#query").val() === "")
		return false;
	FindUser($("#query").val());
	return false;
});

$("#moreInfo").data("expanded", false);

$("#moreInfo").click(function() {
	toggleExpand();
});

function FindUser(query) {
	$("#submit").val("Search...");
	$("#invalidUser").html("No User Found");
	$("#moreInfo").html("+ Expand");
	$(".expandedInfo").hide();

	$.ajax({
		url: "/search/" + query,
		success: function(data) {
			success = true;
			$("#submit").val("Search");

			if (data.error) {
				console.log(data.error);
				window.history.pushState('Steam ID Finder', 'Steam ID Finder', '');
				if ($("#search-container").css("background-color") !== "rgba(0, 0, 0, 0)") {
					toggleExpand(false);
				}
				toggleUserNotFound(false);
				return;
			}

			toggleUserNotFound(true);


			$("#steamBadge").css("background-image", "url(img/badge.png)");
			if ($("#search-container").css("background-color") === "rgba(0, 0, 0, 0)") {
				$("#search-container").animate({
					top: "12%",
					position: "static",
					"background-color": "#333",
					boxShadow: '0px 2px 10px 3px rgba(0,0,0,0.46)'
				});

				$("#logo").animate({
					"margin-bottom": "0px",
					"margin-left": "0px"
				});
			} else {
				toggleExpand(false);
			}
			window.history.pushState('Steam ID Finder', 'Steam ID Finder', '?id=' + data.steam64);
			var imageLoad = $("#hidden").append('<img src="//steamsignature.com/profile/english/' + data.steam64 + '.png" id="imageLoad">');
			$("#imageLoad").load(function() {
				$("#imageLoad").remove();
				$("#steamBadge").css("background-image", "url(//steamsignature.com/profile/english/" + data.steam64 + ".png)");
			});
			$("#communityID").val(data.steam64);
			$("#steamID").val(data.steamID);
			$("#personaname").val(data.displayName);
			$("#profileurl").val(data.profileURL);
			$("#profileurl").click(function() {
				OpenInNewTab($("#profileurl").val());
			});
			$("#lastlogoff").val(time_ago(new Date(data.lastLogOff * 1000)));


			var timeCreated = "";
			if (data.timeCreated !== 0) {
				var createdDate = new Date(data.timeCreated * 1000);
				var months = ["January", "February", "March", "April", "May", "June",
					"July", "August", "September", "October", "November", "December"];
				timeCreated = createdDate.getUTCDate() + " " + months[createdDate.getUTCMonth()] + " " + createdDate.getUTCFullYear();
			}

			// Expanded info
			$("#steamID32").val(data.steam32);
			$("#steamID3").val(data.steam3);
			$("#realName").val(data.realName);
			$("#public").val(data.public);
			$("#state").val(data.state);
			$("#countryCode").val(data.countryCode);
			$("#countryCodeFlag").addClass("flag-" + data.countryCode.toLowerCase());
			$("#primaryGroupID").val(data.primaryGroupID);
			$("#timeCreated").val(timeCreated);
			$("#currentlyPlaying").val(data.currentlyPlaying);
			$("#serverIP").val(data.serverIP);

			$("#userInfo").fadeIn("slow");
		},
		error: function() {
			$("#submit").val("Search");
			$("#invalidUser").html("Something Went Wrong");
			$("#invalidUser").fadeOut();
			console.log("Failed to search for user");
			$("#invalidUser").fadeIn(function() {
				setTimeout(function() {
					$("#invalidUser").fadeOut();
				}, 5000);
			});
		},
		asynch: false
	});
}

function toggleExpand(expand) {
	if (expand !== undefined) {
		$("#moreInfo").data("expanded", !expand);
	}
	if (!$("#moreInfo").data("expanded")) {
		$("#moreInfo").data("expanded", true);
		// Expand
		$("#search-container").animate({
			top: "4%",
		});
		$("#moreInfo").html("- Less");
		$(".expandedInfo").each(function() {
			if ($(this).find("input").val() === "" || $(this).find("input").val() == "0") {
				return;
			}
			$(this).show();
		});
	} else {
		$("#moreInfo").data("expanded", false);
		// Lessen
		$("#search-container").animate({
			top: "12%",
		});
		$("#moreInfo").html("+ Expand");
		$(".expandedInfo").hide();
	}
}

function toggleUserNotFound(userFound) {
	if (!userFound) {
		$("#userInfo").animate({
			"margin-top": "40px"
		}, 400);
		setTimeout(function() {
			$("#invalidUser").fadeIn(function() {
				setTimeout(function() {
					toggleUserNotFound(true);
				}, 5000);
			});
		}, 200);
	} else {
		setTimeout(function() {
			$("#userInfo").animate({
				"margin-top": "8px"
			}, 400);
		}, 200);

		$("#invalidUser").fadeOut();
	}
}

function OpenInNewTab(url) {
	var win = window.open(url, '_blank');
	win.focus();
}

// function DateTimeAgo(timestamp) {
// 	// Date is in seconds
// 	// var seconds = Math.round(new Date() / 1000) - timestamp;
// 	// if (seconds <= 0) {
// 	// 	return "unavailable";
// 	// } else if (seconds <= 60) {
// 	// 	return seconds + " seconds ago";
// 	// } else if (seconds <= 3600) {
// 	// 	var minutes = Math.floor(seconds / 60);
// 	// 	return minutes + " minutes ago";
// 	// } else if (seconds <= 86400) {
// 	// 	var minutes = Math.floor(seconds / 60);
// 	// 	var hours = Math.floor(minutes / 60);
// 	// 	var minutesRemainder = Math.round((minutes % 86400) / 10);
// 	// 	return hours + " hours, " + minutesRemainder + " minutes ago";
// 	// } else if (seconds <= 31536000) {
// 	// 	return Math.floor(seconds / 60 / 60 / 24) + " days ago";
// 	// } else {
// 	// 	return Math.floor(seconds / 60 / 60 / 24 / 365) + " years ago";
// 	// }

// 	var years = 0,
// 		months = 0,
// 		days = 0,
// 		hours = 0,
// 		minutes = 0,
// 		seconds = 0;

// 	seconds = Math.floor((new Date() - new Date(timestamp*1000)) / 1000);
// 	years = Math.floor(seconds / 31536000);
// 	months = Math.floor(seconds / 2592000);
// 	days = Math.floor(seconds / 86400);
// 	hours = Math.floor(seconds / 3600);
// 	minutes = Math.floor(seconds / 60);

// 	console.log(years);
// 	console.log(months);
// 	console.log(days);
// 	console.log(hours);
// 	console.log(minutes);
// 	console.log(seconds);

// 	if (years > 0) {
// 		if (months > 0) {
// 			return years + " years, " + months + " months";
// 		}
// 		return years + " years";
// 	}

// 	if (months > 0) {
// 		if (days > 0) {
// 			return months + " months, " + days + " days";
// 		}
// 		return months + " months";
// 	}

// 	if (days > 0) {
// 		if (hours > 0) {
// 			return days + " days, " + hours + " hours";
// 		}
// 		return days + " days";
// 	}

// 	if (hours > 0) {
// 		if (minutes > 0) {
// 			return hours + " hours, " + minutes + " minutes";
// 		}
// 		return hours + " hours";
// 	}

// 	if (minutes > 0) {
// 		if (seconds > 0) {
// 			return minutes + " minutes, " + seconds + " seconds";
// 		}
// 		return minutes + " minutes";
// 	}

// 	return seconds + " seconds";

// }

function time_ago(time) {

	switch (typeof time) {
		case 'number': break;
		case 'string': time = +new Date(time); break;
		case 'object': if (time.constructor === Date) time = time.getTime(); break;
		default: time = +new Date();
	}
	var time_formats = [
		[60, 'seconds', 1], // 60
		[120, '1 minute ago', '1 minute from now'], // 60*2
		[3600, 'minutes', 60], // 60*60, 60
		[7200, '1 hour ago', '1 hour from now'], // 60*60*2
		[86400, 'hours', 3600], // 60*60*24, 60*60
		[172800, 'Yesterday', 'Tomorrow'], // 60*60*24*2
		[604800, 'days', 86400], // 60*60*24*7, 60*60*24
		[1209600, 'Last week', 'Next week'], // 60*60*24*7*4*2
		[2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
		[4838400, 'Last month', 'Next month'], // 60*60*24*7*4*2
		[29030400, 'months', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
		[58060800, 'Last year', 'Next year'], // 60*60*24*7*4*12*2
		[2903040000, 'years', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
		[5806080000, 'Last century', 'Next century'], // 60*60*24*7*4*12*100*2
		[58060800000, 'centuries', 2903040000] // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
	];
	var seconds = (+new Date() - time) / 1000,
		token = 'ago', list_choice = 1;

	if (seconds == 0) {
		return 'Just now'
	}
	if (seconds < 0) {
		seconds = Math.abs(seconds);
		token = 'from now';
		list_choice = 2;
	}
	var i = 0, format;
	while (format = time_formats[i++])
		if (seconds < format[0]) {
			if (typeof format[2] == 'string')
				return format[list_choice];
			else
				return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;
		}
	return time;
}