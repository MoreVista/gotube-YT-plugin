var YT2009 = new Object();
YT2009.rev = 9;
YT2009.SearchDesc = "YT2009 (Full Preload)";
YT2009.Name = "YT2009";

// 【重要】YT2009インスタンスのURL (末尾の「/」はなし)
//[Important] YT2009 instance URL (without the trailing "/")
var INSTANCE_URL = "http://192.168.2.12:8080"; 

// ヘルパー関数
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
    
    var sortBy = "relevance";
    if (keyword.charAt(0) == '@') {
        sortBy = "published";
        keyword = keyword.substring(1);
    }

    // デバッグ用
    if (keyword == "test") {
        result.VideoInfo = new Array();
        var v = { attr: 2, id: "test" };
        v.Title = "Connection Test";
        var check = GetContents(INSTANCE_URL + "/get_video_info?video_id=test");
        if (check && check.length > 0) {
            v.Description = "OK: Connected";
        } else {
            v.Description = "FAILED: Connection Error";
        }
        v.URL = "";
        result.VideoInfo.push(v);
        result.end = 1;
        result.total = 1;
        return result;
    }

    var apiUrl = INSTANCE_URL + '/feeds/api/videos?q=' + escape(keyword) + 
                 '&start-index=' + result.start + 
                 '&max-results=' + result.bypage + 
                 '&orderby=' + sortBy + 
                 '&racy=include&v=2&alt=xml';

    var xml = GetContents(apiUrl);
    result.VideoInfo = new Array();
    
    if (xml) {
        var entries = xml.split("<entry>");
        for (var i = 1; i < entries.length; i++) {
            var entry = entries[i];
            var v = { attr: 2 };

            var fullId = my_extract(entry, "<id>", "</id>");
            if (fullId == "") continue;

            var lastSlash = fullId.lastIndexOf("/");
            v.id = (lastSlash != -1) ? fullId.substring(lastSlash + 1) : fullId;

            v.Title = my_extract(entry, "<title type='text'>", "</title>");
            var durStr = my_extract(entry, "duration='", "'");
            v.LengthSeconds = parseInt(durStr);
            if (isNaN(v.LengthSeconds)) v.LengthSeconds = 0;

            var author = my_extract(entry, "<name>", "</name>");
            v.Description = "Author: " + author;
            v.ThumbnailURL = 'http://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg';
            
            // FLVとして保存
            v.SaveFilename = v.id + ".flv";
            
            v.URL = 'YT2009.play("' + v.id + '")';
            result.VideoInfo.push(v);
        }
    }

    if (result.VideoInfo.length > 0) {
        result.end = result.start - 1 + result.VideoInfo.length;
        result.total = result.start + 100;
    } else {
        var err = { attr: 2, id: "error" };
        err.Title = "No Results Found";
        err.Description = "URL: " + INSTANCE_URL;
        err.URL = "";
        result.VideoInfo.push(err);
        result.end = 1;
        result.total = 1;
    }
    
    return result;
};


YT2009.play = function (id) {
    
    //ページ生成トリガー
        var url1 = INSTANCE_URL + "/watch?v=" + id;


    // 動画生成トリガー

        var url2 = INSTANCE_URL + "/get_video?video_id=" + id;

    
    // 本読み込み
    return INSTANCE_URL + "/assets/" + id + ".flv";
};

SiteList.push(YT2009);