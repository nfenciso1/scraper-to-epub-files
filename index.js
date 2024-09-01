import dotenv from 'dotenv';
import fs from 'fs';
import { JSDOM } from 'jsdom';
import { DOMParser, XMLSerializer } from 'xmldom';

dotenv.config();

const epubTitle = process.env.EPUB_TITLE;
const epubDisplayTitle = process.env.EPUB_DISPLAY_TITLE;

const author = process.env.AUTHOR;
const publisher = process.env.PUBLISHER;
const bookId = process.env.BOOK_ID;
const tocUrl = process.env.TOC_URL;

const tocDepth = 2; // ToC means Table of Contents

/*
    ToC of depth 2 looks like so:

    - Book 1
        - Chapter 1
        - Chapter 2
        - Chapter 3
        ...
        - Chapter 30
    - Book 2
        - Chapter 1
        ...
    ...
*/

let tableOfContents = await fetch( tocUrl );    // GET ToC page
tableOfContents = await tableOfContents.text(); // Process into text

const dom = new JSDOM(tableOfContents); // Emulate DOM
let ul = Array.from( dom.window.document.querySelectorAll("ul") );  // Get all ul elements and put into a list

// The following variables will be used for EPUB files
// Check https://www.jedisaber.com/eBooks/Introduction.shtml to study the content and structure of an EPUB file
let chapterIdList = [];
let chapterTitleList = [];
let chapterHrefList = [];

let bookNum = 1;
for (let i = 0; i < ul.length; i++) {   // Loop through each ul element
    
    // A filter is needed as some ToC pages in Wordpress websites use ul elements not just for the indicated chapters.
    // The following IF block is the specific filter used for a certain site.
    // In this case, each Book in the ToC (equivalent to ul) contained at least 20 Chapters (equivalent to li).
    // Change as needed.
    if (ul[i].children.length < 20) {
        continue
    }

    console.log('Book '+bookNum);

    // EPUB related block
    let dir = './generated/'+epubTitle+'/OEBPS';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    for (let j = 0; j < ul[i].children.length; j++) {   // Loop through each li to fetch the Chapter pages

        // Create file for simple EPUB page indicating current Book number
        if (j == 0) {
            let titleHtml = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd"><html><head><title>Book '+bookNum+'</title></head><body><p><b>BOOK '+bookNum+'</b></p></body></html>';
            let titleDoc = new DOMParser().parseFromString(titleHtml, "text/html");
            let titleConverted = new XMLSerializer().serializeToString(titleDoc);

            let src = './generated/'+epubTitle+'/OEBPS/book'+bookNum+'.xhtml';

            fs.writeFileSync(src, titleConverted); 

            chapterIdList.push("B"+bookNum);
            chapterTitleList.push("Book "+bookNum);
            chapterHrefList.push("book"+bookNum+".xhtml");
        }
        
        // Extract Chapter URL
        let listChild = ul[i].children[j];
        let chapterUrl = (listChild.innerHTML)   .match(/href="([^"]*)/)[1];
        let chapterTitle = listChild.textContent;

        console.log("- "+chapterTitle);
        
        let chapterRaw = await fetch(chapterUrl);   // GET chapter page
        chapterRaw = await chapterRaw.text();       // Process into text

        let chapterDom = new JSDOM(chapterRaw);     // Emulate DOM

        // Insert code here that removes certain elements to reduce occurrences of manual correction later
        chapterDom.window.document.querySelectorAll('[name="_GoBack"]').forEach(e => e.remove());   
        
        // Site-specific code. In this case, the last child of element with class "entry-content" is not a part of the chapter
        // Change as needed
        let contentRaw = chapterDom.window.document.querySelector(".entry-content");
        let lastChild = contentRaw.children.length-1;
        contentRaw.children[lastChild].remove();

        // Create file containing Chapter for the EPUB
        let chapterContent = contentRaw.innerHTML;
        chapterContent = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd"><html><head><title>'+chapterTitle+'</title></head><body>'+chapterContent+'</body></html>';
        let chapterDoc = new DOMParser().parseFromString(chapterContent, "text/html");
        let chapterConverted = new XMLSerializer().serializeToString(chapterDoc);

        let src;
        let epubSrc;
        let cleanTitle;
        try {
            cleanTitle = chapterTitle.replace(/[^0-9a-zA-Z]/g,'');
            cleanTitle = cleanTitle.replaceAll(" ", "");
            
            src = './generated/'+epubTitle+'/OEBPS/'+bookNum+cleanTitle+'.xhtml';
            epubSrc = bookNum+cleanTitle+'.xhtml';

            fs.writeFileSync(src, chapterConverted);    
        } catch (error) {
            console.log(error);
        }
        //
        

        chapterIdList.push("B"+bookNum+cleanTitle);
        chapterTitleList.push(chapterTitle);
        chapterHrefList.push(epubSrc);
    }

    bookNum++;
}


// Mostly code for creating EPUB-related files below. 
// Again, check https://www.jedisaber.com/eBooks/Introduction.shtml for understanding the contents

const containerXML = 
`<?xml version="1.0" encoding="UTF-8"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
            <rootfile full-path="OEBPS/Content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
    </container>
`;

let dir = './generated/'+epubTitle+'/META-INF';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}
fs.writeFileSync('./generated/'+epubTitle+'/META-INF/container.xml', containerXML);

let manifestStr = "";
chapterIdList.map((_, index)=>{
    manifestStr += '<item id="'+chapterIdList[index]+'" href="'+chapterHrefList[index]+'" media-type="application/xhtml+xml" />\n';
});

let spineStr = "";
chapterIdList.map((id)=>{
    spineStr += '<itemref idref="'+id+'" />\n';
});

let contentOPF = `<?xml version="1.0" encoding="UTF-8" ?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0" >
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
        <dc:title>`+epubDisplayTitle+`</dc:title>
        <dc:creator opf:role="aut">`+author+`</dc:creator>
        <dc:language>en-US</dc:language>
        <dc:rights>Public Domain</dc:rights>
        <dc:publisher>`+publisher+`</dc:publisher>
        <dc:identifier id="BookID" opf:scheme="UUID">`+bookId+`</dc:identifier>
    </metadata>
    <manifest>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
        
        `+manifestStr+`
    </manifest>
    <spine toc="ncx">
        `+spineStr+`
    </spine>
</package>`
;

// Add inside manifest tag if you want to use external css:
// <item id="style" href="stylesheet.css" media-type="text/css" />

let navStr = "";
let k;
for (k = 0; k < chapterIdList.length; k++) {
    if (chapterIdList[k].length === 2) {
        navStr += `<navPoint id="`+chapterIdList[k]+`" playOrder="`+(k+1)+`" >
        <navLabel>
            <text>`+chapterTitleList[k]+`</text>
        </navLabel>
        <content src="`+chapterHrefList[k]+`"/>`;

        k++;
        while (k < chapterIdList.length && !chapterHrefList[k].startsWith('book')) {
            navStr += `<navPoint id="`+chapterIdList[k]+`" playOrder="`+(k+1)+`" >
                        <navLabel>
                            <text>`+chapterTitleList[k].replaceAll("&","&amp;")+`</text>
                        </navLabel>
                        <content src="`+chapterHrefList[k]+`"/>
                        </navPoint>\n`;
            k++;
        }

        navStr += `</navPoint>\n`;
        k--;
    }

    // Comment code block above and uncomment block below for ToC of depth 1:
    /*
    navStr += `
    <navPoint id="`+id+`" playOrder="`+(index+1)+`">
        <navLabel>
            <text>`+chapterTitleList[index]+`</text>
        </navLabel>
        <content src="`+chapterHrefList[index]+`"/>
    </navPoint>\n
    `
    */
   /*   
    ToC of depth 1 looks like so:
        - Chapter 1
        - Chapter 2
        - Chapter 3
        ...
        - Chapter 30
   */
};

let tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">

<head>
    <meta name="dtb:uid" content="`+bookId+`"/>
    <meta name="dtb:depth" content="`+tocDepth+`"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
</head>

<docTitle>
    <text>`+epubTitle+`</text>
</docTitle>

<navMap>
    `+navStr+`
</navMap>
</ncx>`;

fs.writeFileSync('./generated/'+epubTitle+'/OEBPS/Content.opf', contentOPF);
fs.writeFileSync('./generated/'+epubTitle+'/OEBPS/toc.ncx', tocNcx);
fs.writeFileSync('./generated/'+epubTitle+'/mimetype', "application/epub+zip");

console.log("Successfully created files necessary for epub conversion!");


/*
    Template for extra stuff that may be added within the string at contentOPF:
        <item id="titlepage" href="title_page.xhtml" media-type="application/xhtml+xml" />
        <item id="chapter01" href="chap01.xhtml" media-type="application/xhtml+xml" />
        <item id="chapter02" href="chap02.xhtml" media-type="application/xhtml+xml" />
        <item id="pagetemplate" href="page-template.xpgt" media-type="application/vnd.adobe-page-template+xml" />
        <item id="imgl" href="images/sample.png" media-type="image/png" />
*/