## Description

The rowbot-articulator is a Server Side JavaScript Library utility (built for MarkLogic) that transforms relational data into a structured JSON object.

This project is built to work with the marklogic-rowbot project.  See: [marklogic-rowbot](https://github.com/bradmann/marklogic-rowbot).

The transformation is achieved using a JSON configuration object that defines how the relational tables map to a JSON structure.  The configuration allows for 1-1 joins (join) and 1 - many joins (outerJoin) as well as nested (recursive) structures.

### Sample Output
The sample JSON document that might be generated from the [Configuration](#Sample-Configuration) below.

```
{
	studentId: "12345",
	lastName: "Jones",
	firstName: "Bob",
	createDate: "2013-04-18T07:00:00.000Z",
	addresses: [{
		number: "7777",
		address: "123 Main Street",
		addressType: "HOME",
		state: "WA",
		city: "WallahWallah",
		zip: "22222"
	},{
		number: "1111",
		address: "456 Main Street",
		addressType: "WORK",
		state: "WA",
		city: null,
		zip: "22223"
	}],
	email: [],
	phone: [{
		phoneNumber: "777-555-1212",
		phoneType: "HOME"
	}]
}
```

### Sample Configuration
The example below shows a simple configuration that was used to create the above object.  

This configuration assumes RowBot has also pulled a "STUDENT_ID" for all tables as well.  Because studentId is only specified in the configuration once, it only appears in the JSON object once.

```
var util = require('/lib/rowbotUtil.sjs');

const jsonConfiguration = {
	'students-collection': {
		fields: {
			studentId: "STUDENT_ID",
			lastName: "LAST_NAME",
			firstName: "FIRST_NAME",
			createDate: {dbname: "CREATE_DATE", function: util.isoDate},
			addresses: [],
			email: [],
			phone: []
		},
		outerJoin: {
			'address-collection': {field: 'addresses', joinKeys: {primaryKey: 'STUDENT_ID', foreignKey: 'STUDENT_ID'}},
			'email-collection': {field: 'email', joinKeys: {primaryKey: 'STUDENT_ID', foreignKey: 'STUDENT_ID'}},
			'phone-collection': {field: 'phone', joinKeys: {primaryKey: 'STUDENT_ID', foreignKey: 'STUDENT_ID'}}
		},
		primaryKey: {field: 'STUDENT_ID', order: 'ascending'}
	},
	'address-collection': {
		fields: {
			number: "NUM",
			address: "ADDRESS",
			addressType: "ADDRESS_TYPE",
			state: "STATE",
			city: "CITY",
			zip: "ZIP"
		},
		primaryKey: [{field: 'STUDENT_ID', order: 'ascending'},{field: 'ADDRESS', order: 'ascending'}]
	},
	'email-collection': {
		fields: {
			emailAddress: "EMAIL_ADDR",
			addressType: "ADDR_TYPE",
			prefEmailFlag: "PREF_EMAIL_FLAG"
		},
		primaryKey: [{field: 'EMAIL_ADDR', order: 'ascending'}]
	},
	'phone-collection': {
		fields: {
			phoneNumber: "PHONE",
			phoneType: "PHONE_TYPE"
		},
		primaryKey: [{field: 'PHONE', order: 'ascending'}]
	}
};
```

Each configuration key, details how a RowBot query maps to the above conceptual object. 

## Usage

### Invoking the Transform
To construct a [JSON Document](#Sample-Output) using a supplied, you need to pass in an object that corresponds to the "driving" table. 
```
var q = cts.collectionQuery("students-collection");
for (var doc of cts.search(q)) {
	// This document corresponds to one row in the Driving table.
	var studentObject = doc.toObject();
	// Pass in: the JSON Configuration, Driving Table collection, Driving Table Object
	var studentJson = util.buildJsonDocument(jsonConfiguration, 'students-collection', studentObject);
	// ** DO SOMETHING WITH studentJson
}
```

### Default and Custom Transformations
Notice the *createDate* field, with that field we invoke a special handler function to convert the field into an ISO date.  If the value for a property is an object, the Articulator engine will look for a *function* property, and invoke that as a function pointer, passing in the ```(value, key)``` into that function for conversion.  Some handler functions are included for convenience.  

The default transformation is to trim any whitespace from a value.  If the value = '' or is undefined, the property will not appear in the transformed object.

### Joins
* join - a one-to-one join across two relation tables.  This will merge fields from query1 with fields from query2.
	* Supports composite/multi-value key
	* Must supply a primaryKey and foreignKey values.
	* Be sure not to allow conflicting column names across the two, as values may be lost when merging.
* outerJoin - a one-to-many merge across two relational queries.
	* Supports composite/multi-value key
	* Must supply a primaryKey and foreignKey values, AS WELL AS a target field (type must be an Array)

### Tips
Typically a RowBot query will correspond to one dataset/collection inserted into MarkLogic, however, RowBot allows for complex queries to be defined in its configuration files, so complex joins may also be handled there as well, provided the data returned constructs one conceptual object per returned row.