var YT2009 = new Object();
YT2009.rev = 5;
YT2009.SearchDesc = "YT2009 (Watch+Assets)";
YT2009.Name = "YT2009";

// 【重要】YT2009インスタンスのURL (末尾の「/」はなし)
var INSTANCE_URL = "http://192.168.2.12:8080"; 

// 安全にタグの中身を取り出すヘルパー関数
function my_extract(str, startTag, endTag) {
    var s = str.indexOf(startTag);
    if (s == -1) return "";
    s += startTag.length;
    var e = str.indexOf(endTag, s);
    if (e == -1) return "";
    return str.substring(s, e);
}

YT2009.Search = function (keyword, page) {
    var result = new Object();
    result.bypage = 20;
    result.start = (page - 1) * result.bypage + 1;
    
    // 検索オプション処理
    var sortBy = "relevance";
    if (keyword.charAt(0) == '@') {
        sortBy = "published";
        keyword = keyword.substring(1);
    }

    // デバッグ: "test"で検索した時の通信テスト
    if (keyword == "test") {
        result.VideoInfo = new Array();
        var v = { attr: 2, id: "test" };
        v.Title = "Connection Test";
        var check = GetContents(INSTANCE_URL + "/feeds/api/videos?q=test&max-results=1&v=2");
        if (check && check.length > 0) {
            v.Description = "OK: Connected (" + check.length + " bytes)";
        } else {
            v.Description = "FAILED: Could not connect to " + INSTANCE_URL;
        }
        v.URL = "";
        result.VideoInfo.push(v);
        result.end = 1;
        result.total = 1;
        return result;
    }

    // 検索API呼び出し
    var apiUrl = INSTANCE_URL + '/feeds/api/videos?q=' + escape(keyword) + 
                 '&start-index=' + result.start + 
                 '&max-results=' + result.bypage + 
                 '&orderby=' + sortBy + 
                 '&racy=include&v=2&alt=xml';

    var xml = GetContents(apiUrl);
    result.VideoInfo = new Array();
    
    if (xml) {
        // XMLを <entry> タグごとに分割して処理
        var entries = xml.split("<entry>");
        
        // i=1から開始 (0番目はヘッダー情報なので無視)
        for (var i = 1; i < entries.length; i++) {
            var entry = entries[i];
            var v = { attr: 2 };

            // ID抽出: <id>.../videos/VIDEO_ID</id>
            var fullId = my_extract(entry, "<id>", "</id>");
            if (fullId == "") continue; // IDがないデータは飛ばす

            var lastSlash = fullId.lastIndexOf("/");
            if (lastSlash != -1) {
                v.id = fullId.substring(lastSlash + 1);
            } else {
                v.id = fullId;
            }

            // タイトルなどの情報抽出
            v.Title = my_extract(entry, "<title type='text'>", "</title>");
            
            // 時間（秒）
            var durStr = my_extract(entry, "duration='", "'");
            v.LengthSeconds = parseInt(durStr);
            if (isNaN(v.LengthSeconds)) v.LengthSeconds = 0;

            // 投稿者
            var author = my_extract(entry, "<name>", "</name>");
            v.Description = "Author: " + author;

            // サムネイル (YouTube直接参照)
            v.ThumbnailURL = 'http://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg';
            
            v.SaveFilename = v.id + ".mp4";
            
            // 再生関数へ
            v.URL = 'YT2009.play("' + v.id + '")';
            
            result.VideoInfo.push(v);
        }
    }

    // 結果処理
    if (result.VideoInfo.length > 0) {
        result.end = result.start - 1 + result.VideoInfo.length;
        result.total = result.start + 100; // 簡易計算
    } else {
        // 結果が0件の場合のメッセージ表示（デバッグ用）
        var err = { attr: 2, id: "error" };
        err.Title = "No Results Found";
        err.Description = "URL: " + INSTANCE_URL + "\nKeyword: " + keyword;
        err.URL = "";
        result.VideoInfo.push(err);
        result.end = 1;
        result.total = 1;
    }
    
    return result;
};

YT2009.play = function (id) {
    // 1. watchページにアクセスしてサーバー側のキャッシュ生成をトリガー
    // GetContentsは同期処理（完了するまで待つ）なので、サーバーの準備時間を稼げる
    var watchUrl = INSTANCE_URL + "/watch?v=" + id;
    var dummy = GetContents(watchUrl);
    
    // 2. assets URLを返す
    return INSTANCE_URL + "/assets/" + id + ".mp4";
};

SiteList.push(YT2009);