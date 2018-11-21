/* HOW TO USE:
- install casperjs globally
- install slimejs globally,
- install a Firefox version between 53 and 59 (most likely have to downgrade)
- run `casperjs create-goodbits-template.js --botemail="$GOODBITS_USER_EMAIL" --botpassword="$GOODBITS_USER_PASSWORD" --engine="slimerjs" --botblogurl="https://www.emberjs.com/blog/2018/11/16/the-ember-times-issue-73.html"
- use the `--debug=true` for development */
var casper = require('casper').create();
casper.options.viewportSize = {width: 1600, height: 950};

var blogPage = casper.cli.get('botblogurl');
var blogFullContent = [];

function collectContentFromBlog(pageUrl) {
  /* Helper Utils */
  function domNodesDiff(fullList, excludedList) {
    return Array.prototype.slice.call(fullList).filter((el) => Array.prototype.slice.call(excludedList).indexOf(el) < 0);
  }

  function getTextFromParagraphs(paragraphs) {
    return [].map.call(paragraphs, function(para) {
      return para.outerHTML;
    }).join("");
  }

  /* Collecting all paragraphs, titles and links from the blog post page */
  var contentCollection = [];

  var allHeaders = document.querySelectorAll('#toc-content .anchorable-toc');
  var numOfSections = allHeaders.length;

  /* Adding Intro Content */
  var introAndSectionParagraphs = document.querySelectorAll('#toc-content p');
  var sectionParagraphs = document.querySelectorAll(
    `#toc-content .anchorable-toc:nth-of-type(1) ~ p,
    #toc-content .anchorable-toc:nth-of-type(1) ~ ul,
    #toc-content .anchorable-toc:nth-of-type(1) ~ .blog-row`
  );
  var introParagraphs = domNodesDiff(introAndSectionParagraphs, sectionParagraphs);
  var editionNum = pageUrl.match(/[0-9]*.html/)[0].match(/[0-9]*/)[0];
  var introTitle = `Issue #${editionNum}`;
  var sectionSubTitle = `The Ember Times - Issue #${editionNum}`;
  var introBody = getTextFromParagraphs(introParagraphs);

  contentCollection.push({ sectionBody: introBody, sectionTitle: introTitle, sectionSubTitle });

  for (var index = 0; index < numOfSections; index += 1) {
    var thisIndex = index + 1;
    var nextIndex = thisIndex < numOfSections ? thisIndex + 1 : null;
    var allParagraphs = document.querySelectorAll(
      '#toc-content .anchorable-toc:nth-of-type(' + thisIndex + ') ~ p, #toc-content .anchorable-toc:nth-of-type(' + thisIndex + ') ~ ul, #toc-content .anchorable-toc:nth-of-type(' + thisIndex + ') ~ .blog-row'
    );
    if (nextIndex) {
      var secondParagraphs = document.querySelectorAll(
        `#toc-content .anchorable-toc:nth-of-type(${nextIndex}) ~ p,
        #toc-content .anchorable-toc:nth-of-type(${nextIndex}) ~ ul,
        #toc-content .anchorable-toc:nth-of-type(${nextIndex}) ~ .blog-row`
      );
      var currentParagraphs = domNodesDiff(allParagraphs, secondParagraphs);
    } else {
      var currentParagraphs = allParagraphs;
    }

    var sectionBody = getTextFromParagraphs(currentParagraphs);
    var sectionTitle = document.querySelector(`#toc-content .anchorable-toc:nth-of-type(${thisIndex})`).textContent;
    var sectionLink = document.querySelector(`#toc-content .anchorable-toc:nth-of-type(${thisIndex}) a:nth-child(2)`).href;

    contentCollection.push({ sectionTitle, sectionLink, sectionBody });
  }

  return contentCollection; /* works */
}

function getContent() {
  /* CONTENT COLLECTION FROM BLOG POST */

  casper.start(blogPage).thenEvaluate(function() {
    console.log("/// Content Collection ///////////////////////////////////");
    console.log("Visiting " + blogPage + "...");
  });

  casper.wait(1000, function() {
    console.log("Starting content collection...");
  });

  casper.then(function() {
    // aggregate results from the post
    blogFullContent = this.evaluate(collectContentFromBlog, this.cli.get('botblogurl'));
    console.log("Collected text content from " + blogFullContent.length + " sections to copy.");
  });

  casper.then(function() {
    this.wait(2000, function() {
      console.log("Ready for template creation ✨");
      console.log("/// Goodbitsing ///////////////////////////////////");
    });
  });
}


/* ------------------------------------------------------------------------------ */

/* GOODBITS TEMPLATING */
var homePage = 'https://goodbits.io/';
var signInPage = 'https://goodbits.io/users/sign_in';
var emailPage = 'https://goodbits.io/c/7430/emails';
var signInButton = '#sign-in-button';
var signInForm = '#new_user';
var sidebar = '.sidebar-nav-items-wrapper';
var emailList = 'form[action="/c/7430/emails"]';
var addNewEmailTemplate = '.button-new-issue';
var editEmail = '.newsletter_emails_edit';
var addContent = '.js-add-content-btn';
var lastContentChoice = '.cb-tab-group_content-choices a:last-child';
var goBackToMainView = '.cb-nav__header-action[href$="edit"]';
var contentWindow = '.cb-details__container';
var contentTitle = 'input[id$="-title"][id^="content-block"]';
var contentSubTitle = 'input[id$="-preheader"][id^="content-block"]';
var contentMainLink = '.js-fetch-link-data-field';
var contentBody = 'trix-editor';
var contentChoices = '.cb-tab-group_content-choices';

function contentItem(num) {
  return '.js-cb-sortable li[data-position="' + parseInt(num + 2) + '"] a';
}

var botId = casper.cli.get('botemail');
var botPwd = casper.cli.get('botpassword');

function createTemplate() {
  // signin to Goodbits
  casper.start(signInPage).thenEvaluate(function(botId, botPwd) {
      var emailField = '#user_email';
      var pwdField = '#user_password';
      var signInFormSubmit = 'input[type="submit"]';
      document.querySelector(emailField).setAttribute('value', botId);
      document.querySelector(pwdField).click();
      document.querySelector(pwdField).value = botPwd;
      document.querySelector(signInFormSubmit).click();
  }, botId, botPwd);

  // wait for main view to load
  casper.then(function() {
    this.waitForSelector(sidebar, function() {
      console.log("Logged in successfully ✨");
    });
  });

  // go to emails and create a new empty template
  casper.thenOpen(emailPage, function() {
    this.waitForSelector(emailList, function() {
      this.click(addNewEmailTemplate);
    });
  });

  // add the intro section
  var introContent = blogFullContent.shift();
  addIntroBlock(casper, introContent);

  // add all other sections
  /* blogFullContent.map(function(content, index) {
    addContentBlockRoutine(casper, content, index);
  }); */

  // wrapping up
  casper.waitForSelector(editEmail, function() {
    console.log("beep bop 🤖🐹...");
  });

  /* Sub Routines */
  function addIntroBlock(casper, content) {
    /* Start Adding Content Block */
    casper.then(function() {
      this.wait(5000, function() {
        console.log("Adding intro....");
      });
    });

    casper.waitForSelector(addContent).thenEvaluate(function() {
      document.querySelector('.js-cb-sortable li[data-position="0"] a').click();
    });

    casper.waitForSelector(contentWindow).thenEvaluate(function(contentSubTitle, contentBody, contentTitle, content) {
      document.querySelector(contentTitle).setAttribute('value', content.sectionTitle); /* works */
      document.querySelector(contentBody).value = content.sectionBody;
      document.querySelector(contentSubTitle).setAttribute('value', content.sectionSubTitle);
    }, contentSubTitle, contentBody, contentTitle, content);

    casper.wait(3000, function() {
      console.log("Added intro. ✨");
    });

    casper.waitForSelector(goBackToMainView).thenEvaluate(function(goBack) {
      document.querySelector(goBack).click();
    }, goBackToMainView);
    /* Stop Adding Intro */
  }

  function addContentBlockRoutine(casper, content, iteration) {
    /* Start Adding Content Block */
    casper.waitForSelector(editEmail).thenEvaluate(function(addContent) {
      document.querySelector(addContent).click();
    }, addContent);

    casper.waitForSelector(contentChoices).thenEvaluate(function(lastContentChoice) {
      document.querySelector(lastContentChoice).click();
    }, lastContentChoice);

    casper.waitForSelector('.cb-inline-list').thenEvaluate(function() {
      document.querySelector('.cb-inline-list a[href$="16"]').click();
    });

    casper.then(function() {
      this.wait(2000, function() {
        console.log("Editing content (" + parseInt(iteration + 1) + "/" + blogFullContent.length + ")");
      });
    });

    casper.thenEvaluate(function(goBack) {
      document.querySelector(goBack).click();
    }, goBackToMainView);

    var contentItemSelector = contentItem(iteration);

    casper.waitForSelector(addContent).thenEvaluate(function(contentItemSelector) {
      document.querySelector(contentItemSelector).click();
    }, contentItemSelector);

    casper.waitForSelector(contentWindow).thenEvaluate(function(contentMainLink, contentBody, contentTitle, content) {
      document.querySelector(contentMainLink).setAttribute('value', content.sectionLink);
      document.querySelector(contentBody).value = content.sectionBody;
      document.querySelector(contentTitle).setAttribute('value', content.sectionTitle);
    }, contentMainLink, contentBody, contentTitle, content);

    casper.wait(3000, function() {
      console.log("Finished editing content (" + parseInt(iteration + 1) + "/" + blogFullContent.length + ")");
    });

    casper.waitForSelector(goBackToMainView).thenEvaluate(function(goBack) {
      document.querySelector(goBack).click();
    }, goBackToMainView);
    /* Stop Adding Content Block */
  }
}

getContent();

casper.then(function() {
  createTemplate();
  /* Finish the editing routine */
  this.wait(2000, function() {
    console.log("✨✨✨ The template is now ready for your review at https://goodbits.io/c/7430/emails ✨");
    console.log("If you had any issues running the script, feel free to report those or send bug fixes to https://github.com/jessica-jordan/emberjs-times-tools");
    console.log("Thank you for helping with The Ember Times today and see you again another time! 💖");
  });
});

casper.run();
