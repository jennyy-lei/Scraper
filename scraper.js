const rp = require('request-promise');
const cheerio = require('cheerio');

const get_data = function() {
	const site = {
		method: 'POST',
		uri: "https://www.ctvnews.ca/health/coronavirus/tracking-every-case-of-covid-19-in-canada-1.4852102",
	}

	const graph = {
		method: 'GET',
		uri: "https://beta.ctvnews.ca/content/dam/common/exceltojson/COVID-19%20Canada.txt",
	}

	return rp(site).then((parsedBody) => {
		const bdy = cheerio.load(parsedBody);

		return rp(graph).then((str) => {
			const json = JSON.parse(str);

			return {
				current_stats: parse_data(bdy, site.uri),
				daily_stats: format_data(json),
			}
		})
	}).catch((err) => {
		// console.log(err);
		return -1;
	});
}

const format_data = function(json) {
	let data = [];

	let minDate = maxDate = Number(json[0].date_start);

	json.forEach((person, i) => {
		if(!person.date_start) {
			return;
		}

		minDate = Number(person.date_start) < minDate ? Number(person.date_start) : minDate;
		maxDate = Number(person.date_start) > maxDate ? Number(person.date_start) : maxDate;
	})

	console.log(minDate);

	for (let i = minDate; i <= maxDate; ++i) {
        data.push({
			date: to_date(i),
			dateNum: i,
			new: 0,
			cumulative: 0,
			provinceData: init_prov(),
        })
	}

	json.forEach((person) => {
		let date = data.find(day => day.dateNum === Number(person.date_start));
		if(date) {
			++date.new;

			let province = date.provinceData.find(province => province.name === person.province);
			if(province) {
				++province.new;
			}
		}
	})
	  
	data.forEach((day, i) => {
		day.cumulative = day.new + (i === 0 ? 0 : data[i-1].cumulative);

		day.provinceData.forEach((province, ind) => {
			province.cumulative = province.new + (i === 0 ? 0 : data[i-1].provinceData[ind].cumulative);
		})
        // cumulative += day.new;
	})
  
	return data;
}

const to_date = function(excelDate) {
	return new Date((excelDate - (25567 + 2))*86400*1000);
}

const init_prov = function() {
	const provinceNames = [
		"British Columbia",
		"Alberta",
		"Saskatchewan",
		"Manitoba",
		"Ontario",
		"Quebec",
		"New Brunswick",
		"Nova Scotia",
		"Prince Edward Island",
		"Newfoundland and Labrador",
		"Yukon",
		"Northwest Territories",
		"Nunavut"
	];

	let obj = [];

	for (name of provinceNames) {
		obj.push({
			name: name,
			new: 0,
			cumulative: 0,
		})
	}

	return obj;
}

const parse_data = function($, link) {
	const lastUpdated = $('span.date')
		.slice(1)
		.text()
		.trim();

	const total = $('div.articleBody > .covid-province-table')
		.map((_, table) => {
			const arr = $(table).find('thead > tr > th')
				.map((index, row) => {
					const name = $(row)
						.text()
						.trim();
					const num = $(table)
						.find(`tbody > tr > td:nth-child(${index + 1})`)
						.text()
						.trim()
						.replace(/,/gi, '');

					return {
						name: name,
						num: num,
					};
				}).toArray();

			return [arr];
	}).toArray();

	const provinces = $('div.covid-province-container')
		.map((_, province) => {
			const tableNames = ['Cases', 'Status', 'Test Details'];
			const name = $(province).find('h2')
				.text()
				.replace('(Back to top)\n\t\tCase History', '')
				.trim();
			const data = $(province)
				.find('.covid-province-table')
				.map((index, table) => {
					const tableName = $(province).find(`h3:nth-child(${index + 1})`).text().trim();
					const arr = $(table).find('thead > tr > th')
						.map((index, row) => {
							const name = $(row)
								.text()
								.trim();
							const num = $(table)
								.find(`tbody > tr > td:nth-child(${index + 1})`)
								.text()
								.trim()
								.replace(/,/gi, '');

							return {
								name: name,
								num: num,
							};
						}).toArray();

					return {
						tableName: tableNames[index],
						table: arr,
					};
				}).toArray()

			return {
				province: name,
				data: data,
			}
		}).toArray();

    return {
		lastUpdated: lastUpdated,
		url: link,
		national: total,
		provincial: provinces,
	};
}

exports.get_data = get_data;

get_data().then(res => console.log(res));