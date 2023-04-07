# AWS lambdaを使用したサーバレスサイト構築

## 作成するサイトイメージ
![サイトイメージ](/assets/img/siteimage.png "サイトイメージ")

## サイト構成イメージ
![サイト構成イメージ](/assets/img/siteenv.png "サイト構成イメージ")

## 環境準備
- 以下の環境をローカルに準備する。
  - Visual Studio Code
    - Nugetで以下のアドインを追加
      - Japanese Language Pack for Visual Studio Code
      - C# for Visual Studio Code
      - Vetur (vue tooling for VS Code)
  - Node.js
  - 本レポジトリを任意のフォルダにダウンロード
    - staticSiteFrontEnd : Webアプリケーション(vue)
    - lambdaFunc/staticSiteBackEnd : 更新処理(Lambda関数)
    - lambdaFunc/updateNotifyFunc : 更新通知処理(Lambda関数)

- VisualStudioCodeでダウンロードしたフォルダを開く。
- 「ターミナルを開く」を選択し、以下のコマンドを実行。
``` bash
$ npm install --save
```
- エクスプローラ上にnode_modules等のフォルダが追加される。
- 続いて、次のコマンドを実行する。  
``` bash
$ npm run build
```  
- 以下のメッセージがでて、distフォルダが作成されればOK。  
  途中、Lintのエラーがあるが、無視してよし。
``` bash
DONE  Build complete. The dist directory is ready to be deployed.
INFO  Check out deployment instructions at https://cli.vuejs.org/guide/deployment.html
```

上記の作業で、distフォルダにフロントUIが生成されます。

## ①.WEBページ配信
### S3バケットを作成
#### AWS S3にバケットを作成し、Webフロントページのファイル、html/js/cssを格納します(環境準備で作成したdistフォルダ)
- ブラウザを起動し、AWSコンソールを起動する。
※ブラウザはGoogleChromeを推奨します。
- AWSコンソールからサービス「S3」を選択し、「バケットを作成」をクリック。
- 「名前とリージョン」画面で以下の内容を入力して「次へ」。
  - 「バケット名」：任意
  - 「リージョン」：「アジアパシフィック(東京)」
- 「オプションの設定」画面では、そのまま「次へ」。
- 「確認」画面で「バケットを作成」をクリック。
- 作成したバケットを選び、フォルダ「public」を作成。
- 作成したフォルダを選択し、「アップロード」を選択。
- 手順「環境準備」でビルドした「dist」フォルダの内容をドラッグドロップして、「アップロード」をクリック。

### Cloud Front を設定
#### S3に格納したWebページをCloudFrontを介して配信し、HTTPSアクセスできるようにします。
- サービスから「CloudFront」を選択。
- 上部メニューから「ディストリビューションを作成」をクリック。
  - 「オリジナルドメイン」に作成したS3バケット（xxxxxxxx.s3.amazonaws.com）を指定
  - 「S3バケットアクセス」で「Origin access control settings (recommended)」を選択
  - 「Origin access control」では「コントロール設定を作成」をクリック
  - 「ディストリビューションを作成」をクリックする。
  - 作成後、画面上部に S3バケットのポリシーが表示されるので、青いバーの「ポリシーをコピー」をクリック。
  ![originaccess](/assets/img/originaccess.png)

  - S3画面に移動し、対象のバケット-[アクセス許可]を選択し、バケットポリシーの編集画面を開いて、コピーした内容を貼り付ける。

- 作成されたディストリビューションを選び「地理的制限」をクリック。その後、「編集」ボタンをクリックする。
  - 「制限タイプ」で「許可リスト」を選択し、「国」に「日本」を指定。  
     ※これにより、海外からの不正なアクセスなどを制限できる  

以上でCloudFront設定は完了です。ブラウザから、CloudFrontのDomainNameに示されたアドレスに対してアクセスし、サインインページが表示されればOK。
　[https://[DomainName(～.cloudfront.net)]/public/pages/signin.html](https://[DomainName(～.cloudfront.net)]/public/pages/signin.html)

## ②.Cognitoでユーザ管理
### ユーザプールを作成
#### サイトへのログインユーザのサインアップ機能、ユーザ管理にCognitoを使用します。最初に、ユーザを管理するための「ユーザプール」を作成します。
- AWSコンソールで、リージョンに「東京」を指定。
- サービス「Amazon Cognito」を選択し、「ユーザプール」をクリック。
- 「ユーザプールを作成」をクリック。
- 「プール名」は任意に指定し、「ステップに従って設定する」をクリック。  
  ※以下は設定例です。認証要件に応じて任意に設定して下さい。
  - step1.「認証プロバイダ」画面
    - 「Cognito ユーザープールのサインインオプション」：「Eメール」を選択
  - step2.「セキュリティ要件を設定」画面
    - 「パスワードポリシー」：「Cognito のデフォルト」を選択
    - 「多要素認証」：「MFAなし」を選択
  - step3.「サインアップエクスペリエンスを設定」画面
    - （そのまま）
  - step4.「メッセージ配信を設定」画面
    - 「Eメールプロバイダー」：「Cognito で E メールを送信」
    - 「カスタム属性」：以下を追加
      - 「名前」：「yourname」
      - 「タイプ」：「String」
  - step5.「アプリケーションを統合」画面
    - 「ユーザープール名」：「books-share-userpool」
    - 「アプリケーションクライアント名」：「books-share-apps」
- 「ユーザプールの概要」この後のIDプール作成で使用するため、次の情報を控える。
  - 「全般設定」画面の「プールID」
  - 「アプリクライアント」画面の「アプリクライアントID」
- 「ユーザ」タブから「ユーザを作成」をクリック
  - 「ユーザ情報」画面
    - 「招待メッセージ」：「E メールで招待を送信」
    - 「E メールアドレス」：招待するユーザーのメールアドレスを入力
    - 「E メールアドレスを検証済みとしてマークする」：チェック
    - 「仮パスワード」：パスワードの生成
  
以上でユーザプールの作成は完了です。

### フェデレーティッドIDを作成
- AWSコンソールで、リージョンに「東京」を指定。
- サービス「Amazon Cognito」を選択し、「フェデレーティッドID」をクリック。
- 「新しいIDプールの作成」をクリック。
  - step1.「IDプールを作成する」画面
    - 「IDプール名」：「books-share-id-pool」
    - 「認証プロバイダ」：「Cognito」
      - 「ユーザープール ID」：前述の手順で控えたプールIDを設定
      - 「アプリクライアントID」：前述の手順で控えたアプリクライアントIDを設定
    - 「プールの作成」をクリック
  - step2. アクセス認証に対して「許可」を設定
- 

### WebアプリにCognito情報を設定(Visual Studio Code)
#### すでにアップロードしたWebサイトのソースを再度開いて Cognito情報を設定し、サインアップとの関連付けを行います。
- 自クライアントPCでVsCodeのソースから、「.env」ファイルを開き、以下の情報を設定して保存する。
``` js
VUE_APP_AWS_COGNITO_REGION="ap-northeast-1"  #1
VUE_APP_AWS_COGNITO_ID_POOL_ID=ap-northeast-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx  #2 
VUE_APP_AWS_COGNITO_USERPOOL_ID=ap-northeast-1_xxxxxxxx  #3
VUE_APP_AWS_COGNITO_USERPOOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxx #4 
```
1. `ap-northeast-1` (東京)を設定
2. 「フェデレーティッドID」、サンプルコードに表示される「IDプールのID]を設定
3. 「ユーザプール」、全般タブの、「プールID」を設定
4. 「ユーザプール」、アプリクライアントタブの、「アプリクライアントID」を設定
- ターミナルを開き、ビルドコマンドを実行。
  ``` bash
  $ npm run build
  ```
「dist」フォルダにビルド結果が保存される。
- 手順①を参考に、S3にファイルを再アップする。この時S3「public」フォルダ内の既存ファイルは全消しのうえ、アップロードしなおすこと。  
また、初回と同様に、パブリックアクセス件を付与することに注意。
- （次に「CloudFront」の配信キャッシュをクリアする）サービスからCloudFrontを選択する。
- 手順①で作成したDestributionを選択し「Invalidations」をクリック。	
- 「Create Invalidations」をクリックし、「Object Path」に、「/*」(すべて)を入力して「Invalidate」をクリック。

以上でWebアプリの再配信は完了です。再度ページにアクセスして、ログインを確認してみましょう。  

##### 確認手順
- アクセス先 [https://[DomainName(～.cloudfront.net)]/public/pages/signin.html](https://[DomainName(～.cloudfront.net)]/public/pages/signin.html)
- 「Register an Account」を選択する。
- ログインに使用するためのメールアドレス、パスワードを入力して「Register」ボタンをクリック。
- しばらくすると登録したメールアドレスに検証コード（6桁）が送付されてくる。
- ページに表示されている「Verify Key」に6桁の検証コードを入力して「Verify」ボタンをクリックする。
- ログイン画面から、登録したメールアドレスとパスワードを入力して「Login」をクリックし、「Serverless Testing Page」ページが表示されたらOK。

## ③書籍データ配信／更新
### DynamoDBにテーブルを作成する
#### 貸し出し状況を管理するためのテーブルを、DynamoDB上に作成します。
- AWSコンソールで「リージョン」を「アジアパシフィック(東京)」に変更する。  
- サービスから「DynamoDB」を選択。
- 左のメニューから、「テーブルの作成」をクリック。
- 任意のテーブル名、プライマリキーに「title」(文字列)を設定して、「作成」ボタンをクリックする。
- 「項目の作成」ボタンをクリックし、「Tree」を「Text」に変更し、以下のJSONデータを張り付けて「保存」する。
``` json
{
  "title": {
    "S": "Amazon Web Services 実践入門"
  },
  "description": {
    "S": "柔軟な開発を可能にするインフラ構築・運用の勘所。ブラウザでの設定もコマンド操作も丁寧に解説。"
  },
  "imgUrl": {
    "S": "https://books.google.com/books/content?id=6LayjgEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api"
  },
  "isbn": {
    "S": "9784774176734"
  },
  "rentalDate": {
    "NULL": true
  },
  "rentalStatus": {
    "NULL": true
  },
  "rentalUser": {
    "NULL": true
  }
}
```
- 続いて貸し出し履歴テーブルを作成します。引き続き「テーブルの作成」をクリック。
- 任意の履歴テーブル名(～Historyなど)、プライマリキーに「rentalDateTime」(文字列)を設定して、「作成」ボタンをクリックする。

### AWSCodeStarで開発環境を構築
#### サーバサイドアプリをLambdaで開発するための環境を、AWS CodeStarで構築します。
- サービスの一覧から「AWS CodeStar」を選択する。
- 「新規プロジェクトの作成」をクリックする。
  - プロジェクトのテンプレートから、以下を選択する。  
  `Express.js + ウェブサービス + AWS Lambda`
  - 「プロジェクト詳細」画面で「プロジェクト名」を任意に設定
  - 「レポジトリ」は「AWS CodeCommit」を選択
  - そのまま「次へ」をクリックし、「プロジェクトを作成する」をクリックする。
- 出来上がったプロジェクトを選択したのち「IDE」タブから「環境の作成」をクリックする。
  - 「インスタンスタイプ」には「t2.micro」を選択。  
  - 「VPC」「サブネット」は任意のネットワークを指定すること。  
     ただし、使用するサブネットは[パブリックサブネットである必要がある](https://docs.aws.amazon.com/cloud9/latest/user-guide/vpc-settings.html)こと。  
※無償期間を過ぎている場合は、ここから有料になるので注意。
- 「続行」をクリックすると、環境が自動で作成されるのでしばらく待つ。

### AWS Cloud9でサーバサイドアプリを作成
#### AWS Cloud9を起動し、LambdaからコールされるNode.jsアプリを開発する。
- 左メニューから「IDE」を選択し、表示されるプロジェクト名で「IDEを開く」を選択。
- 画面下のコンソールを選択し、指示どおりユーザ名とe-mailアドレスを入力してEnterを押下する。  
  ``` bash
  >ec2-user:~/environment$ git config --global user.name [ユーザ名]
  >ec2-user:~/environment$ git config --global user.email [e-mailアドレス]
  ```
- プロジェクトに `.gitignore` ファイルを作成し、内容を以下のとおりとする。  
  ``` js
  node_modules/
  ```
これにより、node.jsのライブラリモジュールフォルダである、「node_modules」フォルダがgit管理から除外される。
- 添付の `update_AwsLambda` フォルダから以下３つのファイルの内容をコピーし、同名のファイルに上書きする。
  - `package.json`
  - `template.yml`
  - `app.js`   

- `app.js` 内の以下のテーブル名を、前述のdynamoDB内に作成したテーブル名に変更する。
  ``` js
  const BOOKS_TABLE = '★テーブル名★';
  ```
- `app.js` 内の以下のORIGINの名称を、前述のCloud FrontのEndpointにへ変更する。
  ```js
  const ALLOWED_ORIGIN = 'https://d2vevmte87y0br.cloudfront.net';
  ```

- 画面下のコンソールを選択し、以下のコマンドを実行する。
  ``` bash
  >ec2-user:~/environment$ cd [プロジェクト名]
  >ec2-user:~/environment/[プロジェクト名](master)$git add .
  >ec2-user:~/environment/[プロジェクト名](master)$git commit -m 1st.
  >ec2-user:~/environment/[プロジェクト名](master)$git push
  ```
- これにより、githubにソースがPushされ、自動的にビルド、デブプロイが実行される。
- CodeStar画面に切り替えると、右下に実行状況が表示される。デプロイが「成功」と表示されればOK。
- （以下、アクセス制限の変更）
- サービスから「IAM」を選択し、「ロール」から、「CodeStar-`[プロジェクト名]`-Exection」を選択する。
- 下部の「境界の削除」を選択する。確認メッセージも「削除」を選択する。
- 再びサービスを「CodeStar」の当該プロジェクトに戻し、画面右側にある、「アプリケーションのエンドポイント」のアドレスをコピー、そのアドレスに対して「/getall」を付与したアドレスに、ブラウザからアクセスする。
  ```
  例）https://xxxxxx.execute-api.ap-southeast-1.amazonaws.com/Prod/getall
  ```
- この結果、dynamoDBに登録した内容がJSONで返却されれば、アプリとテーブルの関連が正しく行われている。
  ``` json
  {"Items":[{"rentalDate":null,"isbn":"9784774176734","rentalStatus":null,"description":"柔軟な開発を可能にするインフラ構築・運用の勘所。ブラウザでの設定もコマンド操作も丁寧に解説。","rentalUser":null,"imgUrl":"https://books.google.com/books/content?id=6LayjgEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api","title":"Amazon Web Services 実践入門"}],"Count":1,"ScannedCount":1,"result":"success"}
  ```  
上記でエラーが出る場合は、サービス「CloudWatch」のログから、詳細を確認できるので、そちらで原因を探ってください。  

### Webアプリにアプリケーションのエンドポイント情報を設定(Visual Studio Code)
#### すでにアップロードしたWebサイトのソースを再度開いて アプリケーションのエンドポイント情報を設定し、サインアップとの関連付けを行います。
- 自クライアントPCでVsCodeのソースから、「.env」ファイルを開き、以下の情報を設定して保存する。
  ``` js
  VUE_APP_SAP_BOOKS_SERVICE=https://xxxxxx.execute-api.ap-southeast-1.amazonaws.com/Prod
  ```
- 手順②と同様に `npm run build` でリビルドした後、S3への再アップロード、Cloud Frontの更新を行うこと。
- ブラウザから、Webサイトにアクセスし、貸し出し・返却、およびマスタ更新操作を確認する。

##### 確認手順
- アクセス先 [https://[DomainName(～.cloudfront.net)]/public/pages/signin.html](https://[DomainName(～.cloudfront.net)]/public/pages/signin.html)
- 手順②で登録したメールアドレス、パスワードを入力して「Login」ボタンをクリック。
- サイトメニュー左から、「BookRental」メニューを選択して右側に「Amazon Web Services実践入門」が表示されることを確認。
- 「借りる」リンクをクリックすることで、「貸出状況」が「貸出中」となり、「貸出日」に操作日、 「貸出者」にログインユーザが表示されることを確認。
- 「返却」リンクをクリックすることで、リンク内容が再度「借りる」に戻る(返却済)ことを確認。
- サイトメニュー左から、「Book Maintenance」メニューを選択して、「検索条件」欄に、「AWS」と入力し、「検索」ボタンをクリック。これにより、「AWS」という書籍名の一覧が最大10件まで画面に表示されることを確認。
- いずれかの書籍に対して「登録」をクリックすることで、「在庫」が「本棚にあります」となること、その本が「Book Rental」メニュー側に表示されることを確認。

## ④書籍貸出通知
### AWS Lambdaにメール通知の処理を追加する。
#### AWS Lambdaに関数を追加し、dynamoDBのレコード更新イベント(つまり、貸出・返却の操作)に応じて、管理者へメール通知が送られるような自動処理を追加します。
- サービスから「DynamoDB」を選択し、「テーブル」から前述の手順で作成したテーブルをクリックする。
- 「ストリームの管理」ボタンをクリックする。「表示タイプ」では「新旧イメージ」を選択して「有効化」をクリック。  
  これにより、テーブルのデータ更新が行われたタイミングで AWS lambda への通知が発信されるようになる。
- 次に、サービスから「AWS lambda」を選択し、「関数の作成」をクリックする。
- 「関数の作成」画面では、「一から作成」を選択する。関数名は任意。ランタイムは「Node.js 10.x」を選択して、「関数の作成」ボタンをクリックする。
- 「Desinger」エリアで「トリガーを追加」をクリックし、「トリガーの設定」画面で「DynamoDB」を選択する。「DynamoDB」テーブルには、前述の手順で「ストリームの管理を有効化したテーブル名が自動で表示されるので、「追加」をクリックする。
- `index.js` に、添付 `lambdaFunc/updateNotifyFunc` プロジェクトの、同ファイル名の内容を上書きする。  
※スクリプト内の「★」の部分２か所に、発信元、送信先(サイト管理者)メールアドレスを入力してください。  
　後ほど、SESサービスでこのアドレスに対してメール通知許可設定を行うことになります。
- `moment.js` を追加し、添付 `lambdaFunc/updateNotifyFunc` プロジェクトの、同ファイル名の内容を上書きする。
- 「環境変数」エリアに、`キー「TZ」、値「Asia/Tokyo」` を追加する。(履歴テーブルに設定される貸出日付を、日本標準時間とする)
- 「実行ロール」エリアにある、「既存のロール」から下部の「IAMコンソールで ～ ロールを表示します」をクリックする。
- IAM サービス画面で「+ インラインポリシーの追加」をクリックし、JSONで以下のポリシーを記述してポリシー追加する。
  ``` json
  {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Sid": "VisualEditor0",
              "Effect": "Allow",
              "Action": [
                  "ses:Send*",
                  "dynamodb:PutItem",
                  "dynamodb:GetShardIterator",
                  "dynamodb:DescribeStream",
                  "dynamodb:ListStreams",
                  "dynamodb:GetRecords"
              ],
              "Resource": "*"
          }
      ]
  }
  ```

以上でLambda関数の作成は終了。テストを行う場合は、以下のテストコードを作成して実行する。

  ``` json
  {
    "Records": [
      {
        "eventID": "1",
        "eventVersion": "1.0",
        "dynamodb": {
          "Keys": {
            "title": {
              "S": "AWSによるサーバーレスアーキテクチャ"
            }
          },
          "NewImage": {
            "rentalUser": {
              "S": "Test User"
            },
            "isbn": {
              "S": "9784798155166"
            },
            "rentalStatus": {
              "S": "貸出中"
            }
          },
          "OldImage": {
            "rentalUser": {
              "S": null
            },
            "isbn": {
              "S": null
            },
            "rentalStatus": {
              "S": null
            }
          },
          "StreamViewType": "NEW_AND_OLD_IMAGES",
          "SequenceNumber": "111",
          "SizeBytes": 26
        },
        "awsRegion": "us-west-2",
        "eventName": "MODIFY",
        "eventSourceARN": "eventsourcearn",
        "eventSource": "aws:dynamodb"
      }
    ]
  }
  ```

### SESサービスで、メール通知許可設定を行う。
#### 自動メール配信をするためには、あらかじめSESサービス上で発信元、通知先メールアドレスに対してメール通知許可設定が必要です。SESサービスから承認メールを発信し、送信先アドレスから許可を行います。
- サービスから「Simple Email Service」を選択し、リージョンを「米国西部(オレゴン)」を選択する。
- 左メニューから「Identify Management」-「Email Address」を選択する。
- 「Verify a New Email Address」をクリックし、Emailアドレスを入力して、「Verify This Email Address」ボタンをクリックします。  
これにより、入力したアドレスに承認メールが送られますので、メーラから許可をクリックします。

##### 確認手順
- アクセス先 [https://[DomainName(～.cloudfront.net)]/public/pages/signin.html](https://[DomainName(～.cloudfront.net)]/public/pages/signin.html)
- 手順②で登録したメールアドレス、パスワードを入力して「Login」ボタンをクリック。
- サイトメニュー左から、「BookRental」メニューを選択、「借りる」・「返却」操作を行い、この結果、メールが通知されてくることを確認する。 
