const originalResponse: MockGraphData = {
  nodes: [
    {
      function: "cart_router.add_item_to_cart",
      params: ["user_id", "item_id", "db"],
      response_object: "JSONResponse",
      dependent_libs: ["sqlalchemy"],
      children: [
        {
          function: "cart_service.add_item_to_cart",
          params: ["user_id", "item_id", "quantity"],
          response_object: "CartItem",
          dependent_libs: ["sqlalchemy"],
          children: [
            {
              function: "cart_crud.update_inventory",
              params: ["product_id", "quantity"],
              response_object: "None",
              dependent_libs: ["sqlalchemy"],
              children: [],
            },
          ],
        },
        {
          function: "product_client.add_freebie_if_applicable",
          params: ["cart_id", "product_id", "db"],
          response_object: "CartItem",
          dependent_libs: ["sqlalchemy"],
          children: [
            {
              function: "cart_service.add_freebie_if_applicable",
              params: ["cart_id", "product_id", "db"],
              response_object: "None",
              dependent_libs: ["sqlalchemy"],
              children: [
                {
                  function: "cart_crud.get_freebie_mapping",
                  params: ["product_id", "db"],
                  response_object: "FreebieMapping",
                  dependent_libs: ["sqlalchemy"],
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
const responseWithMoreNestedChildren: MockGraphData = {
  nodes: [
    {
      function: "cart_router.add_item_to_cart",
      params: ["user_id", "item_id", "db"],
      response_object: "JSONResponse",
      dependent_libs: ["sqlalchemy"],
      children: [
        {
          function: "inventoryy_management.check_inventoryy",
          params: ["product_id", "quantity"],
          response_object: "InventoryStatus",
          dependent_libs: ["sqlalchemy"],
          children: [],
        },
        {
          function: "cart_service.add_item_to_cart",
          params: ["user_id", "item_id", "quantity"],
          response_object: "CartItem",
          dependent_libs: ["sqlalchemy"],
          children: [
            {
              function: "cart_crud.update_inventory",
              params: ["product_id", "quantity"],
              response_object: "None",
              dependent_libs: ["sqlalchemy"],
              children: [
                {
                  function: "inventory_management.check_inventory",
                  params: ["product_id", "quantity"],
                  response_object: "InventoryStatus",
                  dependent_libs: ["sqlalchemy"],
                  children: [
                    {
                      function: "inventory_managementtt.check_inventortty",
                      params: ["product_id", "quantity"],
                      response_object: "InventoryStatus",
                      dependent_libs: ["sqlalchemy"],
                      children: [],
                    },
                    {
                      function: "inventory_managementt.check_inaventortt",
                      params: ["product_id", "quantity"],
                      response_object: "InventoryStatus",
                      dependent_libs: ["sqlalchemy"],
                      children: [
                        {
                          function:
                            "inventasdaasaasdsory_managementt.casaheck_inaventortt",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                        {
                          function:
                            "inveasxasasdantory_managementt.chdcseck_inaventortt",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                        {
                          function:
                            "inveytntory_managementt.cheynytck_inaventortt",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                        {
                          function:
                            "invtynentory_managementt.chbfgbeck_inaventortt",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                        {
                          function:
                            "invefgbfntory_managementt.cheytbck_inaventortt",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                        {
                          function:
                            "invenfgbtory_managementt.chefbgck_inaventortt",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                        {
                          function:
                            "inventofgbfry_managementt.chfgbfeck_inaventortt",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                        {
                          function:
                            "invefgbfntory_managementt.chrtgreck_inaventortt",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                        {
                          function:
                            "invedgbfntory_managementt.chesfdck_inaventortt",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                        {
                          function:
                            "invdfvfentory_managementt.rrgrcheck_inaventortt",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                      ],
                    },
                    {
                      function: "inventory_managementttt.check_invewntortty",
                      params: ["product_id", "quantity"],
                      response_object: "InventoryStatus",
                      dependent_libs: ["sqlalchemy"],
                      children: [
                        {
                          function:
                            "inventasory_managementttt.check_invasaxewntortty",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                        {
                          function:
                            "inventory_managzxementttt.check_invewzx ntortty",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                        {
                          function:
                            "inventory_managfbvementttt.check_invnhgewntortty",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                        {
                          function:
                            "inventory_mandfvdfagementttt.check_invdfvdewntortty",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                        {
                          function:
                            "inventory_managdfvdfvementttt.check_invewntortty",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                        {
                          function:
                            "inventory_managementtdvfdtt.check_invedfvdfwntortty",
                          params: ["product_id", "quantity"],
                          response_object: "InventoryStatus",
                          dependent_libs: ["sqlalchemy"],
                          children: [],
                        },
                      ],
                    },
                    {
                      function: "inventory_managementtttt.check_inventtortt",
                      params: ["product_id", "quantity"],
                      response_object: "InventoryStatus",
                      dependent_libs: ["sqlalchemy"],
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          function: "product_client.add_freebie_if_applicable",
          params: ["cart_id", "product_id", "db"],
          response_object: "CartItem",
          dependent_libs: ["sqlalchemy"],
          children: [
            {
              function: "cart_service.add_freebie_if_applicable",
              params: ["cart_id", "product_id", "db"],
              response_object: "None",
              dependent_libs: ["sqlalchemy"],
              children: [
                {
                  function: "ianventory_management.caheck_inventory",
                  params: ["product_id", "quantity"],
                  response_object: "InventoryStatus",
                  dependent_libs: ["sqlalchemy"],
                  children: [],
                },
                {
                  function: "cart_crud.get_freebie_mapping",
                  params: ["product_id", "db"],
                  response_object: "FreebieMapping",
                  dependent_libs: ["sqlalchemy"],
                  children: [
                    {
                      function: "product_discounts.calculate_discount",
                      params: ["product_id", "user_id"],
                      response_object: "DiscountDetails",
                      dependent_libs: ["sqlalchemy"],
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
const responseWithIncreasedComplexity: MockGraphData = {
  nodes: [
    {
      function: "cart_router.add_item_to_cart",
      params: ["user_id", "item_id", "db"],
      response_object: "JSONResponse",
      dependent_libs: ["sqlalchemy"],
      children: [
        {
          function: "cart_service.add_item_to_cart",
          params: ["user_id", "item_id", "quantity"],
          response_object: "CartItem",
          dependent_libs: ["sqlalchemy"],
          children: [
            {
              function: "cart_asdascrud.updaasdaste_inventory",
              params: ["product_id", "quantity"],
              response_object: "None",
              dependent_libs: ["sqlalchemy"],
              children: [],
              //       {
              //         function: "inventory_management.check_inventory",
              //         params: ["product_id", "quantity"],
              //         response_object: "InventoryStatus",
              //         dependent_libs: ["sqlalchemy"],
              //         children: [
              //           {
              //             function: "notification_service.notify_user",
              //             params: ["user_id", "message"],
              //             response_object: "Notification",
              //             dependent_libs: ["sqlalchemy"],
              //             children: [],
              //           },
              //         ],
              //       },
              //     ],
            },
            {
              function: "cart_asdascrud.updaasdasdte_inventory",
              params: ["product_id", "quantity"],
              response_object: "None",
              dependent_libs: ["sqlalchemy"],
              children: [],
            },
            {
              function: "cart_cadsarud.update_iasdasnventory",
              params: ["product_id", "quantity"],
              response_object: "None",
              dependent_libs: ["sqlalchemy"],
              children: [],
            },
            {
              function: "cart_cruasdasd.updatasdase_inventory",
              params: ["product_id", "quantity"],
              response_object: "None",
              dependent_libs: ["sqlalchemy"],
              children: [],
            },
          ],
          //   {
          //     function: "cart_service.apply_discounts",
          //     params: ["cart_id", "discounts"],
          //     response_object: "CartItem",
          //     dependent_libs: ["sqlalchemy"],
          //     children: [
          //       {
          //         function: "product_discounts.calculate_discount",
          //         params: ["product_id", "user_id"],
          //         response_object: "DiscountDetails",
          //         dependent_libs: ["sqlalchemy"],
          //         children: [
          //           {
          //             function: "user_preferences.get_user_preferences",
          //             params: ["user_id"],
          //             response_object: "UserPreferences",
          //             dependent_libs: ["sqlalchemy"],
          //             children: [],
          //           },
          //         ],
          //       },
          //     ],
          //   },
          // ],
        },
        {
          function: "product_client.add_freebie_if_applicable",
          params: ["cart_id", "product_id", "db"],
          response_object: "CartItem",
          dependent_libs: ["sqlalchemy"],
          children: [
            {
              function: "cart_seasdasrvice.add_freebie_asdaif_applicable",
              params: ["cart_id", "product_id", "db"],
              response_object: "None",
              dependent_libs: ["sqlalchemy"],
              children: [
                // {
                //   function: "cart_crud.get_freebie_mapping",
                //   params: ["product_id", "db"],
                //   response_object: "FreebieMapping",
                //   dependent_libs: ["sqlalchemy"],
                //   children: [
                //     {
                //       function: "product_discounts.calculate_discount",
                //       params: ["product_id", "user_id"],
                //       response_object: "DiscountDetails",
                //       dependent_libs: ["sqlalchemy"],
                //       children: [],
                //     },
                //   ],
                // },
              ],
            },
            {
              function: "cart_seasdasdfrvice.add_freebie_if_asdfsapplicable",
              params: ["cart_id", "product_id", "db"],
              response_object: "None",
              dependent_libs: ["sqlalchemy"],              
            },
            {
              function: "cart_sasdsaervice.add_fsadsreebie_if_applicable",
              params: ["cart_id", "product_id", "db"],
              response_object: "None",
              dependent_libs: ["sqlalchemy"],              
            },
            {
              function: "cart_asdasdaservice.add_freebie_if_applicasdsdfreable",
              params: ["cart_id", "product_id", "db"],
              response_object: "None",
              dependent_libs: ["sqlalchemy"],              
            },
          ],
        },
      ],
    },
  ],
};

const usersMockData: MockGraphData = {
  nodes: [
    {
      function: "user_management.get_user_details",
      params: ["user_id"],
      response_object: "UserDetails",
      dependent_libs: ["sqlalchemy"],
      children: [
        {
          function: "user_preferences.get_user_preferences",
          params: ["user_id"],
          response_object: "UserPreferences",
          dependent_libs: ["sqlalchemy"],
          children: [
            {
              function: "user_preferences.get_theme_preference",
              params: ["user_id"],
              response_object: "ThemePreference",
              dependent_libs: ["sqlalchemy"],
              children: [
                {
                  function: "user_preferences.get_theme_colors",
                  params: ["theme_id"],
                  response_object: "ThemeColors",
                  dependent_libs: ["sqlalchemy"],
                  children: [
                    {
                      function: "user_preferences.get_primary_color",
                      params: ["theme_id"],
                      response_object: "PrimaryColor",
                      dependent_libs: ["sqlalchemy"],
                      children: [],
                    },
                    {
                      function: "user_preferences.get_secondary_color",
                      params: ["theme_id"],
                      response_object: "SecondaryColor",
                      dependent_libs: ["sqlalchemy"],
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              function: "user_preferences.get_notification_preference",
              params: ["user_id"],
              response_object: "NotificationPreference",
              dependent_libs: ["sqlalchemy"],
              children: [
                {
                  function: "notification_service.get_user_notifications",
                  params: ["user_id"],
                  response_object: "UserNotifications",
                  dependent_libs: ["sqlalchemy"],
                  children: [],
                },
              ],
            },
          ],
        },
        {
          function: "user_activity.get_user_activity",
          params: ["user_id"],
          response_object: "UserActivity",
          dependent_libs: ["sqlalchemy"],
          children: [
            {
              function: "user_activity.get_most_visited_pages",
              params: ["user_id"],
              response_object: "MostVisitedPages",
              dependent_libs: ["sqlalchemy"],
              children: [],
            },
          ],
        },
      ],
    },
  ],
};
const productsMockData: MockGraphData = {
  nodes: [
    {
      function: "product_catalog.get_product_details",
      params: ["product_id"],
      response_object: "ProductDetails",
      dependent_libs: ["sqlalchemy"],
      children: [
        {
          function: "product_catalog.get_product_reviews",
          params: ["product_id"],
          response_object: "ProductReviews",
          dependent_libs: ["sqlalchemy"],
          children: [
            {
              function: "product_catalog.get_review_details",
              params: ["review_id"],
              response_object: "ReviewDetails",
              dependent_libs: ["sqlalchemy"],
              children: [],
            },
          ],
        },
        {
          function: "product_catalog.get_product_ratings",
          params: ["product_id"],
          response_object: "ProductRatings",
          dependent_libs: ["sqlalchemy"],
          children: [],
        },
        {
          function: "product_catalog.get_related_products",
          params: ["product_id"],
          response_object: "RelatedProducts",
          dependent_libs: ["sqlalchemy"],
          children: [],
        },
      ],
    },
  ],
};

const ordersMockData: MockGraphData = {
  nodes: [
    {
      function: "order_management.get_order_details",
      params: ["order_id"],
      response_object: "OrderDetails",
      dependent_libs: ["sqlalchemy"],
      children: [
        {
          function: "order_management.get_order_items",
          params: ["order_id"],
          response_object: "OrderItems",
          dependent_libs: ["sqlalchemy"],
          children: [
            {
              function: "order_management.get_item_details",
              params: ["item_id"],
              response_object: "ItemDetails",
              dependent_libs: ["sqlalchemy"],
              children: [
                {
                  function: "inventory_management.check_inventory",
                  params: ["product_id", "quantity"],
                  response_object: "InventoryStatus",
                  dependent_libs: ["sqlalchemy"],
                  children: [
                    {
                      function: "notification_service.notify_user",
                      params: ["user_id", "message"],
                      response_object: "Notification",
                      dependent_libs: ["sqlalchemy"],
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          function: "order_management.get_order_status",
          params: ["order_id"],
          response_object: "OrderStatus",
          dependent_libs: ["sqlalchemy"],
          children: [
            {
              function: "order_management.get_order_history",
              params: ["order_id"],
              response_object: "OrderHistory",
              dependent_libs: ["sqlalchemy"],
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");
  // console.log("endpoint", endpoint?.split("/")[1].trim());
  let responseData;

  switch (endpoint?.split("/")[1].trim()) {
    case "user":
      responseData = usersMockData;
      break;

    case "product":
      responseData = productsMockData;
      break;

    case "order":
      responseData = ordersMockData;
      break;

    default:
      responseData = responseWithIncreasedComplexity;
      break;
  }

  await new Promise((resolve) => setTimeout(resolve, 0));
  return new Response(JSON.stringify(responseData), {
    status: 200,
  });
}
