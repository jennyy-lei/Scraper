const rp = require('request-promise');
const cheerio = require('cheerio');

const get_data = function() {
	const site = {
		method: 'POST',
		uri: "https://www.ctvnews.ca/health/coronavirus/tracking-every-case-of-covid-19-in-canada-1.4852102",
	}

	const excel = {
		method: 'GET',
		uri: "https://beta.ctvnews.ca/content/dam/common/exceltojson/COVID-19-Canada-New.txt",
	}

	return rp(site).then((parsedBody) => {
		const bdy = cheerio.load(parsedBody);

		return rp(excel).then((str) => {
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

	json.forEach((day, i, N) => {
		if(!day.Date) {
			return;
		}
		
		let newCases = i == 0 ? 0 : Number(N[i].Can_Total - N[i -1].Can_Total);
		
		data.push({
			date: to_date(Number(day.Date)),
			new: newCases,
			cumulative: Number(day.Can_Total),
			recovered: Number(day.Can_Recovered),
			deaths: Number(day.Can_Death),
			provinceData: init_prov(day, i == 0 ? null : N[i-1]),
		})
	})
  
	return data;
}

const to_date = function(excelDate) {
	return new Date((excelDate - (25567 + 2))*86400*1000);
}

const init_prov = function(data, prevDay) {
	const provinceNames = [
		{short:'BC', long:'British Columbia'},
		{short:'AB', long:'Alberta'},
		{short:'SK', long:'Saskatchewan'},
		{short:'MB', long:'Manitoba'},
		{short:'ON', long:'Ontario'},
		{short:'QC', long:'Quebec'},
		{short:'NB', long:'New Brunswick'},
		{short:'NS', long:'Nova Scotia'},
		{short:'PE', long:'Prince Edward Island'},
		{short:'NL', long:'Newfoundland and Labrador'},
		{short:'YT', long:'Yukon'},
		{short:'NT', long:'Northwest Territories'},
		{short:'NU', long:'Nunavut'}
	];

	let newCases = 0;

	let obj = [];

	for (name of provinceNames) {
		newCases = !prevDay ? 0 : Number(data[`${name.short}_Total`] - prevDay[`${name.short}_Total`]);

		obj.push({
			name: name.long,
			new: newCases <= 0 ? 0 : newCases,
			cumulative: Number(data[`${name.short}_Total`]),
			recovered: Number(data[`${name.short}_Recovered`]),
			deaths: Number(data[`${name.short}_Death`]),
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