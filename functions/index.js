const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.newUserSignUp = functions.auth.user().onCreate(user => {
  return admin.firestore().collection('users').doc(user.uid).set({
    email: user.email,
    upvotedOn: [],
  });
});

exports.userDeleted = functions.auth.user().onDelete(user => {
  const doc = admin.firestore().collection('users').doc(user.uid);
  return doc.delete();
});

exports.addRequest = functions.https.onCall((data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'only authenticated users can add book requests'
    );
  }
  if (data.text.length > 100) {
    throw new functions.https.HttpsError(
      'invalid-argument', 
      'book name must be no more than 100 characters long'
    );
  }
  return admin.firestore().collection('requests').add({
    text: data.text,
    upvotes: 0
  });
});

exports.upvote = functions.https.onCall(async (data, context) => {

  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'only authenticated users can vote up books'
    );
  }

  const user = admin.firestore().collection('users').doc(context.auth.uid);
  const request = admin.firestore().collection('requests').doc(data.id);

  const doc = await user.get();

  if(doc.data().upvotedOn.includes(data.id)){
    throw new functions.https.HttpsError(
      'failed-precondition', 
      'You can only vote a book up once'
    );
  }

  await user.update({
    upvotedOn: [...doc.data().upvotedOn, data.id]
  });

  return request.update({
    upvotes: admin.firestore.FieldValue.increment(1)
  });

});

exports.logActivities = functions.firestore.document('/{collection}/{id}')
  .onCreate((snap, context) => {
    console.log(snap.data());

    const activities = admin.firestore().collection('activities');
    const collection = context.params.collection;

    if (collection === 'requests') {
      return activities.add({ text: 'a new book was added' });
    }
    if (collection === 'users') {
      return activities.add({ text: 'a new user signed up'});
    }

    return null;
});