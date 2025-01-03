describe("Chat", () => {
  let chatId = "";

  before(() => {
    cy.intercept({
      method: "POST",
      url: "**/accounts:lookup**",
    }).as("lookupRequest");

    cy.login("VD7HhTNweAWXSz0TLBnoUaxiv2m2");
    cy.wait("@lookupRequest", { timeout: 5000 });
  });

  beforeEach(() => {
    cy.intercept(
      "GET",
      "https://conversation-staging-api.potpie.ai/api/v1/conversations/*/info/"
    ).as("getChatInfo");

    cy.intercept(
      "GET",
      "https://conversation-staging-api.potpie.ai/api/v1/conversations/*/messages/*"
    ).as("getChatMessages");

    cy.intercept({
      method: "GET",
      url: "**/conversations?start=0&limit=1000",
    }).as("getAllChats");

    if (!chatId) {
      cy.visit("/all-chats");

      cy.wait("@getAllChats", { timeout: 10000 })
        .its("response.statusCode")
        .should("eq", 200);

      cy.get('tr[data-test="0"] td:nth-child(1) a')
        .should("exist")
        .then((a) => {
          const href = a.attr("href");
          chatId = href.split("/").pop();
          cy.visit(href);
        });
    } else {
      cy.visit(`/chat/${chatId}`);
    }

    cy.wait("@getChatInfo", { timeout: 10000 })
      .its("response.statusCode")
      .should("be.oneOf", [200, 304]);

    cy.wait("@getChatMessages", { timeout: 10000 })
      .its("response.statusCode")
      .should("be.oneOf", [200, 304]);
  });

  describe("Node Selector Functionality", () => {
    beforeEach(() => {
      cy.intercept(
        `https://conversation-staging-api.potpie.ai/api/v1/conversations/${chatId}/info/`
      ).as("getChatInfo");

      cy.intercept(
        `https://conversation-staging-api.potpie.ai/api/v1/conversations/${chatId}/messages/*`
      ).as("getChatMessages");

      cy.wait("@getChatInfo")
        .its("response.statusCode")
        .should("be.oneOf", [200, 304]);

      cy.wait("@getChatMessages")
        .its("response.statusCode")
        .should("be.oneOf", [200, 304]);
    });

    it("textarea should be disabled and accept node trigger", () => {
      cy.get(`textarea#message`)
        .should("be.visible")
        .should("have.attr", "data-test-disabled", "active")
        .then(($textarea) => {
          cy.wrap($textarea).type("@");
          cy.wrap($textarea).type("p");

          cy.intercept(`https://stage-api.potpie.ai/api/v1/search`).as(
            "searchNodes"
          );

          cy.wait("@searchNodes");
          cy.get(`textarea#message`).should("contain.value", "@p");
        });
    });

    it("node list navigation and selection", () => {
      cy.get(`textarea#message`).type("@p");

      cy.get('[data-test="node-list"]')
        .should("exist")
        .find('[data-test="node-list-item"]')
        .should("have.length.greaterThan", 0)
        .then(($items) => {
          cy.wrap($items.first()).should("have.attr", "data-selected", "true");

          cy.get("textarea#message").type("{downarrow}");
          cy.get('[data-test="node-list"]')
            .find('[data-test="node-list-item"][data-selected="true"]')
            .should("have.attr", "data-test-node-index", "1");

          cy.get("textarea#message").type("{uparrow}");
          cy.get('[data-test="node-list"]')
            .find('[data-test="node-list-item"][data-selected="true"]')
            .should("have.attr", "data-test-node-index", "0");

          cy.get("textarea#message").type("{enter}");
          cy.get('[data-test="node-list"]').should("not.exist");
        });
    });
  });

  describe("Share Dialog Functionality", () => {
    before(() => {
      cy.intercept("POST", "**/accounts:lookup**").as("lookupRequest");
      cy.intercept("GET", "**/conversations?start=0&limit=1000").as(
        "getAllChats"
      );

      cy.login("VD7HhTNweAWXSz0TLBnoUaxiv2m2");
      cy.visit("/all-chats");

      cy.wait("@getAllChats", { timeout: 10000 })
        .its("response.statusCode")
        .should("eq", 200);

      cy.get('tr[data-test="0"] td:nth-child(1) a')
        .should("exist")
        .then((a) => {
          const href = a.attr("href");
          chatId = href.split("/").pop();
          cy.visit(href);
        });
    });

    beforeEach(() => {
      if (chatId) {
        cy.visit(`/chat/${chatId}`);
      }

      cy.getDataTest("active", "sharebtn")
        .should("exist")
        .should("be.visible")
        .click();
    });

    it("opens share dialog", () => {
      cy.getDataTest("share-dialog").should("exist");
    });

    it("toggles between email and link sharing", () => {
      cy.contains("With Email").click()
      cy.get("input#email").should("exist");

      cy.contains("Anyone With Link").click();
      cy.get("input#email").should("not.exist");
    });

    it("validates email sharing functionality", () => {
      const invalidEmails = [
        "invalidemail",
        "test@",
        "test@domain",
        "@domain.com",
      ];

      invalidEmails.forEach((email) => {
        cy.get("input#email").clear().type(email);
        cy.get("button").contains("Share").should("be.disabled");
      });

      const validEmail = "test@example.com";
      cy.get("input#email").clear().type(validEmail);
      cy.get("button").contains("Share").should("be.enabled");
    });

    it("checks people with access section", () => {
      cy.contains("(You)").should("exist");
      cy.contains("Owner").should("exist");
    });

    it("copy link functionality", () => {
      cy.contains("With Email").click();
      cy.get("input#email").should("exist");

      cy.contains("Anyone With Link").click();
      cy.get("input#email").should("not.exist");

      cy.window().then((win) => {
        cy.stub(win.navigator.clipboard, "writeText").as("copyClipboard");
      });

      cy.contains("button", "Copy Link").click();
      cy.get("@copyClipboard").should("have.been.calledOnce");
    });
  });
});
