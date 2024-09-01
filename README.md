# SCRAPER-TO-EPUB-FILES
This is a script for scraping the Wordpress pages of a certain web serial, extracting the chapters, and converting the data to files needed for EPUB. Before running the script, create a '.env' file and add the needed environment variables (see later section). After running the script, some iterative manual corrections are needed to ensure no errors from the [EPUBCHECK](https://github.com/w3c/epubcheck?tab=readme-ov-file). 

## Prerequisites:  
- Node Package Manager (npm) and Node.js 
    - See https://www.freecodecamp.org/news/node-version-manager-nvm-install-guide/

## Environment Variables:
Format: ENV_VAR=ACTUAL_VALUE

- EPUB_TITLE: The title of the EPUB folder (alphanumeric characters only {A-Za-Z0-9})
- EPUB_DISPLAY_TITLE: The title displayed in EPUB readers (can include spaces and special characters)
- AUTHOR: Author of the book
- PUBLISHER: Publisher of the book. If there is none, still do not leave as blank
- BOOK_ID: Just use this https://www.uuidgenerator.net to generate id
- TOC_URL: The URL of the Table of Contents page (this assumes that each Chapter is a link to the corresponding page)  


## Basic workflow:
1. Run the script (npm start)
2. In the generated/{EPUB TITLE}/ folder, zip ONLY the mimetype file with no compression (Compression mode: Store)
3. Then copy the META-INF and OEBPS folders into the zipped folder created at Step 2
4. Change the file extension of the zipped folder into .epub
5. Run the EPUBCHECK
6. Perform manual corrections, in accordance to errors and warnings reported by the EPUBCHECK
7. Go back to Step 1, until there are no more errors

###### PS: I just made this so that I can have an EPUB of one of my favorite webnovels