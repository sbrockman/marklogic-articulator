/**
 * RowBot Utility Library for converting JSON objects to functions
 *
 * @author Brad Mann brad.mann@marklogic.com
 * @author Steven Brockman steven.brockman@marklogic.com
 */

const LIB = 'rowbotUtil: ';

function buildJsonDocument(dataMap, dataSource, docObject) {
	var dataDef = dataMap[dataSource];
	var dataQuery = cts.andQuery([
		cts.directoryQuery(dataMap.stagingDirectory, 'infinity'),
		cts.collectionQuery(dataSource),
		getPrimaryKeyValueQuery(dataDef, dataSource, docObject)
	]);
	var content = getStagingData(dataMap, dataSource, dataQuery)[0];

	return content;
}

/**
 * Trim whitespace from around field, and conver to null if empty string
 * @param  {String} text      The text to sanitize
 * @return {String}           The sanitized text, or null if the sanitized string is empty.
 */
function trimField(text) {
	var trimmed;
	if (text) {
		trimmed = text.trim();
		trimmed = (trimmed == '') ? undefined : trimmed;
	}
	return trimmed;
}

/**
 * Join/merge a related staging document to a primary document using a key
 * 
 * @param  {Object} dataMap          The dataMap definition file for the object
 * @param  {String} fromDataSource   The string representing the collection for the current query/dataset being processed
 * @param  {String} joinDataSource   The string representing the collection for the dataset to join
 * @param  {docObject} docObject     The current object being processed (used for comparing key values)
 * 
 * @return {Object}                  The final object, containing all keys from both documents.
 */
function leftJoinStagingData(dataMap, fromDataSource, joinDataSource, object) {
	var q = cts.andQuery([
		cts.directoryQuery(dataMap.stagingDirectory, 'infinity'),
		cts.collectionQuery(joinDataSource),
		getJoinQuery(dataMap, fromDataSource, joinDataSource, object)
	]);
	var docObject = cts.exists(q) ? fn.head(cts.search(q)).toObject() : {};
	Object.keys(docObject).forEach(function(key) {
		object[key] = docObject[key];
	});
	return object;
}

function getJoinQuery(dataMap, fromDataSource, joinDataSource, docObject) {
	var fromDataDef = dataMap[fromDataSource];
	var joinDef = fromDataDef.join[joinDataSource];
	var joinQuery = [];
	if (joinDef) {
		if (Array.isArray(joinDef)) {
			joinDef.forEach(function(obj) {
				joinQuery.push(cts.jsonPropertyValueQuery(obj.foreignKey, docObject[obj.primaryKey]));
			});
		} else {
			joinQuery.push(cts.jsonPropertyValueQuery(joinDef.foreignKey, docObject[joinDef.primaryKey]));
		}
	} else {
		returnErrorToClient(400, 'Bad Request', 'Missing primaryKey definition in dataMap for:' + joinDataSource);
	}
	return joinQuery;
}

/**
 * Performs an outer-join on a related staging document to a primary document using a key
 * 
 * @param  {Object} dataMap          The dataMap definition file for the object
 * @param  {String} fromDataSource   The string representing the collection for the current query/dataset being processed
 * @param  {String} joinDataSource   The string representing the collection for the dataset to join
 * @param  {docObject} docObject     The current object being processed (used for comparing key values)
 * 
 * @return [Array]                   The set of objects in an Array.
 */
function leftOuterJoinStagingData(dataMap, fromDataSource, joinDef, docObject) {
	var joinDataDef = dataMap[joinDef.collection];
	var q = cts.andQuery([
		cts.directoryQuery(dataMap.stagingDirectory, 'infinity'),
		cts.collectionQuery(joinDef.collection),
		getOuterJoinQuery(dataMap, fromDataSource, joinDef, docObject)
	]);

	var subobjects = getStagingData(dataMap, joinDef.collection, q);

	return subobjects;
}

/**
 * Constructs the outerjoin query
 * 
 * @param  {Object} dataMap          The dataMap definition file for the object
 * @param  {String} fromDataSource   The string representing the collection for the current query/dataset being processed
 * @param  {String} joinDataSource   The string representing the collection for the dataset to join
 * @param  {docObject} docObject     The current object being processed (used for comparing key values)
 * 
 * @return [Array]                   The cts query
 */
function getOuterJoinQuery(dataMap, fromDataSource, joinDef, docObject) {
	var fromDataDef = dataMap[fromDataSource];
	var outerJoinQuery = [];
	if (joinDef) {
		if (Array.isArray(joinDef.joinKeys)) {
			joinDef.joinKeys.forEach(function(obj) {
				outerJoinQuery.push(cts.jsonPropertyValueQuery(obj.foreignKey, docObject[obj.primaryKey]));
			});
		} else {
			outerJoinQuery.push(cts.jsonPropertyValueQuery(joinDef.joinKeys.foreignKey, docObject[joinDef.joinKeys.primaryKey]));
		}
	} else {
		returnErrorToClient(400, 'Bad Request', 'Missing primaryKey definition in dataMap for:' + joinDef.collection);
	}
	return outerJoinQuery;
}

function getSortSpec(dataDef) {
	//now sorting by primaryKey
	var sort = dataDef.primaryKey;
	var sortSpec = [];
	if (sort) {
		if (Array.isArray(sort)) {
			sort.forEach(function(spec) {
				sortSpec.push(cts.indexOrder(cts.jsonPropertyReference(spec.field, 'collation=http://marklogic.com/collation/codepoint'), spec.order || 'ascending'));
			});
			sortSpec.push(cts.documentOrder('ascending'));
		} else {
			sortSpec = [cts.indexOrder(cts.jsonPropertyReference(sort.field, 'collation=http://marklogic.com/collation/codepoint'), sort.order || 'ascending'), cts.documentOrder('ascending')];
		}
	} else {
		sortSpec = cts.documentOrder('ascending');
	}
	return sortSpec;
}

function getPrimaryKeyValueQuery(dataDef, dataSource, docObject) {
	var pkdef = dataDef.primaryKey;
	var primaryKeyVQ = [];
	if (pkdef) {
		if (Array.isArray(pkdef)) {
			pkdef.forEach(function(obj) {
				primaryKeyVQ.push(cts.jsonPropertyValueQuery(obj.field, docObject[obj.field]));
			});
		} else {
			primaryKeyVQ.push(cts.jsonPropertyValueQuery(pkdef.field, docObject[pkdef.field]));
		}
	} else {
		returnErrorToClient(400, 'Bad Request', 'Missing primaryKey definition in dataMap for:' + dataSource);
	}
	return primaryKeyVQ;
}

function indexLookup(dataMap, indexDef, curObject) {
	var query = cts.andQuery([
			cts.directoryQuery(dataMap.stagingDirectory, 'infinity'),
			cts.collectionQuery(indexDef.collection),
			cts.jsonPropertyValueQuery(indexDef.lookupProperty, curObject[indexDef.localProperty], 'exact')
		]);
	return fn.string(fn.head(cts.elementValues(fn.QName('', indexDef.lookupValue), null, null, query))) || undefined;
}

/**
 * Return linked staging data for the specified data definition and query 
 * NOTE: This function is recursive for any definition that contains 'outerJoin' objects
 * 
 * @param  {Object} dataMap      The dataMap definition file for the object
 * @param  {String} dataSource   The string representing the collection for the current query/dataset being processed
 * @param  {ctsQuery} dataQuery  The query to search
 * @return {Array}               The linked data object
 */
function getStagingData(dataMap, dataSource, dataQuery) {
	var dataDef = dataMap[dataSource];
	var data = [];
	
	for (var doc of cts.search(dataQuery)) {
		var curObject = doc.toObject();

		if (dataDef.hasOwnProperty('join')) {
			Object.keys(dataDef.join).forEach(function(collection) {
				// a join/merge assumes query will only match one object
				curObject = leftJoinStagingData(dataMap, dataSource, collection, curObject);
			});
		}
		if (dataDef.hasOwnProperty('outerJoin')) {
			dataDef.outerJoin.forEach(function(joinObj) {
				curObject[joinObj.field] = leftOuterJoinStagingData(dataMap, dataSource, joinObj, curObject);
			});
		}

		//{collection: 'applicant-paybandlookup-staging', localProperty: 'HRS_JOB_OPENING_ID', lookupProperty: 'HRS_JOB_OPENING_ID', value: 'NI_JO_BANDS'}
		if (dataDef.hasOwnProperty('indexLookup')) {
			Object.keys(dataDef.indexLookup).forEach(function(field) {
				var indexDef = dataDef.indexLookup[field];
				var val = indexLookup(dataMap, indexDef, curObject);
				curObject[field] = val;
			});
		}

		var dataObject = {};
		var fieldFunction;
		if (dataDef) {
			Object.keys(dataDef.fields).forEach(function(key) {
				var fieldName;
				if (typeof dataDef.fields[key] == "object") {
					fieldName = dataDef.fields[key].dbname;
					fieldFunction = dataDef.fields[key].function;
				} else {
					fieldName = dataDef.fields[key];
					fieldFunction = undefined;
				}
				// if the field is an array (may be outerJoin)
				if (Array.isArray(curObject[key]) || fieldName == "__LOOKUP__") {
					dataObject[key] = curObject[key];
				// else if supplied custom function - use that to convert data
				} else if (fieldFunction) {
					dataObject[key] = fieldFunction(curObject[fieldName], key);
				} else if (curObject[fieldName]) {
					dataObject[key] = trimField(curObject[fieldName]);
				}
			});
		} else {
			dataObject = curObject;
		}
		data.push(dataObject);
	}

	data = data.sort((a, b) => {let aStr = xdmp.quote(a); let bStr = xdmp.quote(b); if (aStr < bStr) {return -1} else if (aStr > bStr) {return 1} else {return 0}});

	return data;
}

function returnErrorToClient(statusCode, statusMsg, body)
{
	fn.error(null, 'RESTAPI-SRVEXERR', 
		xdmp.arrayValues([statusCode, statusMsg, body])
	);
};

exports.buildJsonDocument = buildJsonDocument;
exports.returnErrorToClient = returnErrorToClient;