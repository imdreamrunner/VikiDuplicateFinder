Viki Duplicate Content Finder
=============================

## Instruction to Run

### 1. Prerequisites

The program is only test on Mac OS X and Ubuntu 14.04 with Node.js v5.2.0 installed.

It may not be compatible with other version of Node.js.

### 2. Scripts to Run

```
git clone https://github.com/imdreamrunner/VikiDuplicateFinder.git
cd VikiDuplicateFinder.git
npm install
node vpf.js
```

### 3. Using Monitor

Navigate to `http://localhost:3000` in your browser. There are four buttons in the control panel.

* Initialize - Initialize the database. NOTE: This operation will clear all the exisiting data in the database.
* Start - Start the job to find dulpliate contents.
* Pause - Pause the job.
* Stop - Stop the job and go to result page.

You may also browse the result by clicking the "Browse" button on top right corner.

## Design Notes

### How does it crawl data?

1. First visit https://www.viki.com/explore
2. Get all the URLs recursively that match content URL or /explore?page=X
3. Read the Open Graph protocol's title information from content pages.

### Special Files

It stores data into the `data.db` file in SQLite 3 format and log into `log.txt`.

### Technology Used

* SQLite 3
* Node.js 5.2.0
* Koa.js
* WebSocket
* Q