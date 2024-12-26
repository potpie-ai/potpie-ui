describe("Chat", () => {
  let chatId = "";
  before(() => {
    cy.login("VD7HhTNweAWXSz0TLBnoUaxiv2m2").then((user) => {
      cy.wait(3000);
      cy.visit("/all-chats");
      cy.intercept(
        `https://conversation-staging-api.potpie.ai/api/v1/user/conversations?start=0&limit=1000`
      ).as("getAllChats");
      cy.wait("@getAllChats").its("response.statusCode").should("eq", 200);
      cy.get('tr[data-test="0"] td:nth-child(1) a').then((a) => {
        cy.visit(a.attr("href"));
        cy.url().then((url) => {
          chatId = url.split("/").pop();
        });
      });
    });
  });
  it("node selector", () => {
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

    cy.get('[data-test="node-list"]')
      .should("exist")
      .find('[data-test="node-list-item"]')
      .should("have.length.greaterThan", 0)
      .then(($items) => {
        cy.wrap($items.first()).should("have.attr", "data-selected", "true");

        cy.get("textarea#message").type("{downarrow}");
        cy.get('[data-test="node-list"]')
          .find('[data-test="node-list-item"][data-selected="true"]')
          .then(($selectedItem) => {
            cy.wrap($selectedItem).should(
              "have.attr",
              "data-test-node-index",
              "1"
            );
          });

        cy.get("textarea#message").type("{uparrow}");
        cy.get('[data-test="node-list"]')
          .find('[data-test="node-list-item"][data-selected="true"]')
          .then(($selectedItem) => {
            cy.wrap($selectedItem).should(
              "have.attr",
              "data-test-node-index",
              "0"
            );
          });

        cy.get("textarea#message").type("{enter}");

        cy.get('[data-test="node-list"]').should("not.exist");
      });
  });
});
