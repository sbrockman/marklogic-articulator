/**
 * Utility functions
 *
 * @author Brad Mann brad.mann@marklogic.com
 * @author Steven Brockman steven.brockman@marklogic.com
 */


/**
 * Convert a SQL date string into a ML date string
 * @param  {String} dateString The date string to convert
 * @param {String} key passed in from rowbotUtil - not used by this function
 * @return {String}            The converted date string
 */
function isoDate(dateString, key) {
	if (typeof dateString === 'string') {
		if (!isNaN(Date.parse(dateString))) {
			return (new Date(Date.parse(dateString + "Z"))).toISOString();
		} else if (dateString.length === 10) {
			return dateString + 'T00:00:00Z';
		} else if (dateString.split(' ').length == 2) {
			return dateString.split(' ').join('T') + 'Z';
		}
	}
	return undefined;
}

/**
 * Convert value to boolean
 * @param {String} intString The integer string to convert
 * @param {String} key passed in from rowbotUtil - not used by this function
 */
function convertBoolean(booleanString, key) {
	return booleanString && booleanString.toLowerCase() == "y" ? true : false;
}

/**
 * Convert value to an number, returns undefined if it does not exist
 * @param {String} intString The integer string to convert
 * @param {String} key passed in from rowbotUtil - not used by this function
 */
function convertDecimal(intString, key) {
	var val = parseFloat(intString);
	if (!isNaN(val)) {
		return val;
	}
	return undefined;
}

/**
 * Convert value to an decimal number, but returns zero if it does not exist
 * @param {String} intString The integer string to convert
 * @param {String} key passed in from rowbotUtil - not used by this function
 */
function convertDecimalDefaultZero(intString, key) {
	var val = parseFloat(intString);
	if (!isNaN(val)) {
		return val;
	}
	return 0;
}

/**
 * Convert value to an number
 * @param {String} intString The integer string to convert
 * @param {String} key passed in from rowbotUtil - not used by this function
 */
function convertNumber(intString, key) {
	var val = parseInt(intString);
	if (!isNaN(val)) {
		return val;
	}
	return undefined;
}

/**
 * Utility function to sort an array ascending/descending by propertyName
 * 
 * Ex:  util.propertyDateSort(response.professionalExperience, 'startDate', 'descending');
 * 
 * @param array Json Object Array to sort
 * @param propertyName Property of object to be sorted
 * @param order ascending/descending (default is ascending)
 */
function propertyDateSort(array, propertyName, order) {
	function compare(a, b) {
		try {
			if (new Date(a[propertyName]) < new Date(b[propertyName])) {
			return (order == "descending") ? 1 : -1;
			} else if (new Date(a[propertyName]) > new Date(b[propertyName])) {
			return (order == "descending") ? -1 : 1;
			}
		} catch (e) {
		}
		return 0;
	};
	array.sort(compare);
}

/**
 * Trim whitespace from around field, and conver to null if empty string
 * @param  {String} fieldName The name of the field to sanitize
 * @param  {String} text      The text to sanitize
 * @return {String}           The sanitized text, or null if the sanitized string is empty.
 */
function sanitizeField(fieldName, text) {
	var trimmed = text.trim();
	trimmed = (trimmed == '') ? null : trimmed;
	trimmed = (trimmed && dateFields.indexOf(fieldName) != -1) ? isoDate(trimmed) : trimmed;
	return trimmed;
}

exports.propertyDateSort = propertyDateSort;
exports.sanitizeField = sanitizeField;
exports.isoDate = isoDate;
exports.convertNumber = convertNumber;
exports.convertDecimal = convertDecimal;
exports.convertDecimalDefaultZero = convertDecimalDefaultZero;
exports.convertBoolean = convertBoolean;