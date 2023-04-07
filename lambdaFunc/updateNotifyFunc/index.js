const SDK = require('aws-sdk');
const moment = require('moment');

exports.handler = (event, context, callback) => {

   event.Records.forEach((record) => {
       console.log('イベント種別:', record.eventName);
       console.log('DynamoDB Record: %j', record.dynamodb);

       if(record.eventName == 'INSERT'){
           //項目が追加された時の処理
           const newItem = record.dynamodb.NewImage;

       }else if(record.eventName == 'MODIFY'){
           //項目が変更された時の処理
           const oldItem = record.dynamodb.OldImage;//変更前
           const newItem = record.dynamodb.NewImage;//変更後

           //メールタイトル、本文設定
           let mailTitle = '';
           let mailBody = '';
           
           //履歴データ初期化
           let histTitle = record.dynamodb.Keys.title.S;
           let histUser = newItem.rentalUser.S;
           let histIsbn = newItem.isbn.S;
           let histAction = 'A';
           let histTime = moment().format('YYYY/MM/DD HH:mm:ss');
           
           if ((oldItem.rentalStatus !== undefined
               && oldItem.rentalStatus.S === '貸出中')
               && newItem.rentalStatus.NULL) {
               mailTitle = '書籍返却通知';
               mailBody = '書籍が返却されました。\n' +
                          '  書籍：' + oldItem.title.S +
                          '  返却者：' + oldItem.rentalUser.S;
               histAction = '返却';
           } else if (
               (oldItem.rentalStatus === undefined
               || oldItem.rentalStatus.NULL
               || oldItem.rentalStatus.S === ''
               )
               && newItem.rentalStatus.S === '貸出中') {
               mailTitle = '書籍貸出通知';
               mailBody = '書籍が貸し出されました。\n' +
                          '  書籍：' + newItem.title.S +
                          '  貸出者：' + newItem.rentalUser.S;
               histAction = '貸出';
           }
           
           //履歴データ設定
           const params = {
               TableName : '★履歴テーブル名★',
               Item : {
                   'rentalDateTime' : histTime ,
                   'isbn' : histIsbn ,
                   'rentalAction' : histAction ,
                   'title' : histTitle ,
                   'user' : histUser
               }
           };
           
           //DB更新
           const dbClient = new SDK.DynamoDB.DocumentClient({region: 'ap-southeast-1'});
           dbClient.put(params, function (err, data) {
               if (err){
                   throw(err);
               } else {
                   console.log('putItem Success.');
               }
           });
           
           console.log('mailTitle:'+ mailTitle);
           console.log('mailBody :'+ mailBody);

           const ses = new SDK.SES({ region: 'us-west-2' });
           const email = {
               // From
               Source: "★発信元メールアドレス★",
               // To
               Destination: { ToAddresses: ["★送信先(サイト管理者)メールアドレス★"] },
               Message: {
                   // 件名
                   Subject: { Data: mailTitle },
                   // 本文
                   Body: {
                       Text: { Data: mailBody}
                   },
               },
           };
           ses.sendEmail(email,function(err, data) {
               if(err) throw err
               context.succeed("Mail send Succees.");
           });



       }else if(record.eventName == 'REMOVE'){
           //項目が削除された時の処理
           const deletedItem = record.dynamodb.OldImage

       }else{

       }
   });


};