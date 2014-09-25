// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/util.ts" />
/// <reference path="../TestLib/ListViewHelpers.ts" />
// <reference path="../TestData/ListView.less.css" />

module WinJSTests {
    "use strict";

    var testRootEl;

    var ListView = <typeof WinJS.UI.PrivateListView> WinJS.UI.ListView;

    function setupListView(element, layoutName, itemTemplate?) {
        var items = [];
        for (var i = 0; i < 27; ++i) {
            items[i] = { title: "Tile" + i };
        }

        var layout;
        if (layoutName === "CellSpanningLayout") {
            var groupInfo = function (index) {
                return {
                    enableCellSpanning: true,
                    cellWidth: 100,
                    cellHeight: 100
                };
            };
            var itemInfo = function (index) {
                return {
                    width: 100,
                    height: 100
                };
            };
            layout = new WinJS.UI.CellSpanningLayout({ groupInfo: groupInfo, itemInfo: itemInfo, enableCellSpanning: true });
        } else {
            layout = new WinJS.UI[layoutName]();
        }

        var list = new WinJS.Binding.List(items);
        return new WinJS.UI.ListView(element, {
            itemDataSource: list.dataSource,
            itemTemplate: Helper.ListView.createRenderer(itemTemplate || "layoutTestTemplate"),
            layout: layout
        });
    }

    function checkTileSize(listview, index, width, height) {
        var tile = listview.elementFromIndex(index),
            tileWidth = WinJS.Utilities.getTotalWidth(tile),
            tileHeight = WinJS.Utilities.getTotalHeight(tile);
        LiveUnit.Assert.areEqual(width, tileWidth);
        LiveUnit.Assert.areEqual(height, tileHeight);
    }

    function checkTile(listview, index, left, top) {
        var tile = listview.elementFromIndex(index),
            container = Helper.ListView.containerFrom(tile);
        LiveUnit.Assert.areEqual("Tile" + index, tile.textContent.trim());
        LiveUnit.Assert.areEqual(left, Helper.ListView.offsetLeftFromSurface(listview, container), "Error in tile " + index);
        LiveUnit.Assert.areEqual(top, Helper.ListView.offsetTopFromSurface(listview, container), "Error in tile " + index);
    }

    export class LayoutTestsExtra {



        setUp() {

            LiveUnit.LoggingCore.logComment("In setup");

            testRootEl = document.createElement("div");
            testRootEl.className = "file-listview-css";

            var newNode = document.createElement("div");
            newNode.id = "LayoutTests";
            newNode.innerHTML =
            "<div id='metricsPlaceholder'></div>" +
            "<div id='changeLayout1'></div>" +
            "<div id='changeLayout2'></div>" +
            "<div id='layoutTestPlaceholder'></div>" +
            "<div id='layoutTestTemplate' class='layoutTestTile' style='display: none'>" +
            "   <div>{{title}}</div>" +
            "</div>" +
            "<div id='childTemplate' style='display: none'>" +
            "   <div class='layoutTestTile'>{{title}}</div>" +
            "</div>" +
            "<div id='asymmetricalMarginsPlaceholder' class='bigMargins' ></div>" +
            "<div id='asymmetricalMarginsTemplate' class='asymmetricalMarginsTile' style='display: none'>" +
            "   <div>{{title}}</div>" +
            "</div>" +
            "<div id='leadingMarginPlaceholder'></div>" +
            "<div id='leadingMarginTemplate' class='leadingMarginTile' style='display: none'>" +
            "   <div>{{title}}</div>" +
            "</div>";

            testRootEl.appendChild(newNode);
            document.body.appendChild(testRootEl);
            Helper.ListView.removeListviewAnimations();
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");

            WinJS.Utilities.disposeSubTree(testRootEl);
            document.body.removeChild(testRootEl);
            Helper.ListView.restoreListviewAnimations();
        }

        testFirstVisibleInConstructor = function (complete) {
            function test(layoutName) {
                var element = document.createElement("div");
                element.style.width = "200px";
                element.style.height = "200px";
                testRootEl.appendChild(element);

                var data = [];
                for (var i = 0; i < 100; i++) {
                    data.push({
                        label: "Item" + i
                    });
                }

                var requests = [];

                var listView = new ListView(element, {
                    itemDataSource: createDataSource(data, requests),
                    layout: new WinJS.UI[layoutName](),
                    pagesToLoad: 10,
                    itemTemplate: function (itemPromise) {
                        return itemPromise.then(function (item) {
                            var element = document.createElement("div");
                            element.style.width = "100px";
                            element.style.height = "100px";
                            element.textContent = item.data.label;
                            return element;
                        });
                    },
                    indexOfFirstVisible: 24
                });

                return new WinJS.Promise(function (complete) {
                    function checkAndExecute() {
                        if (listView.loadingState === "complete") {
                            if (layoutName.indexOf("GridLayout") == 0) {
                                LiveUnit.Assert.areEqual(1200, listView.scrollPosition);
                            }
                            else {
                                LiveUnit.Assert.areEqual(2400, listView.scrollPosition);
                            }
                            LiveUnit.Assert.areEqual(24, listView.indexOfFirstVisible);

                            LiveUnit.Assert.areEqual(-1, requests.indexOf(2));
                            LiveUnit.Assert.areEqual(-1, requests.indexOf(3));

                            var offsetFromSurface = listView._horizontal() ? Helper.ListView.offsetLeftFromSurface : Helper.ListView.offsetTopFromSurface;
                            LiveUnit.Assert.areEqual(listView.scrollPosition, offsetFromSurface(listView, Helper.ListView.containerFrom(listView.elementFromIndex(24))));

                            listView.removeEventListener("loadingstatechanged", checkAndExecute, false);
                            testRootEl.removeChild(element);
                            complete();
                        }
                    }

                    listView.addEventListener("loadingstatechanged", checkAndExecute, false);
                    checkAndExecute();
                });
            }

            WinJS.Promise.wrap().then(function () {
                LiveUnit.LoggingCore.logComment("testing with GridLayout");
                return test("GridLayout");
            }).then(function () {
                    LiveUnit.LoggingCore.logComment("testing with ListLayout");
                    return test("ListLayout");
                }).done(complete);
        };

        testSingleRealizationWithIndexOfFirstVisible = function (complete) {

            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            testRootEl.appendChild(element);

            var stateChangeCounter = {
                itemsLoading: 0,
                viewPortLoaded: 0,
                itemsLoaded: 0,
                complete: 0
            };

            element.addEventListener("loadingstatechanged", function (eventObject) {
                stateChangeCounter[(<any>eventObject.target).winControl.loadingState]++;
            });


            var data = [];
            for (var i = 0; i < 15000; i++) {
                data.push({
                    label: "Item" + i
                });
            }
            var list = new WinJS.Binding.List(data);

            var listView = new ListView(element, {
                itemDataSource: list.dataSource,
                layout: new WinJS.UI.GridLayout(),
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("div");
                        element.style.width = "100px";
                        element.style.height = "100px";
                        element.textContent = item.data.label;
                        return element;
                    });
                }
            });

            listView.indexOfFirstVisible = 7500;

            WinJS.Utilities.Scheduler.schedulePromiseIdle().then(function () {
                return listView._view._creatingContainersWork ? listView._view._creatingContainersWork.promise : null;
            }).then(function () {
                    return WinJS.Promise.timeout(100);
                }).then(function () {
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.viewPortLoaded);
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.itemsLoaded);
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.complete);

                    element.parentNode.removeChild(element);

                    complete();
                });
        };

        testScrollingSynchronization = function (complete) {

            function createListView() {
                var element = document.createElement("div");
                element.style.width = "300px";
                element.style.height = "300px";
                testRootEl.appendChild(element);

                var data = [];
                for (var i = 0; i < 100; i++) {
                    data.push({
                        label: "Item" + i
                    });
                }
                var list = new WinJS.Binding.List(data);

                var listView = new ListView(element, {
                    itemDataSource: list.dataSource,
                    layout: new WinJS.UI.GridLayout(),
                    itemTemplate: function (itemPromise) {
                        return itemPromise.then(function (item) {
                            var element = document.createElement("div");
                            element.style.width = "100px";
                            element.style.height = "100px";
                            element.textContent = item.data.label;
                            return element;
                        });
                    }
                });

                return Helper.ListView.waitForReady(listView)(listView);
            }

            createListView().then(function (listView) {

                listView.layout = new WinJS.UI.GridLayout();
                listView.indexOfFirstVisible = 30;

                return Helper.ListView.waitForReady(listView)(listView);
            }).then(function (listView) {

                    LiveUnit.Assert.areEqual(30, listView.indexOfFirstVisible);

                    listView.element.parentNode.removeChild(listView.element);

                    return createListView();
                }).then(function (listView) {

                    listView.layout = new WinJS.UI.GridLayout();
                    listView.scrollPosition = 2000;

                    return Helper.ListView.waitForReady(listView)(listView);
                }).then(function (listView) {

                    LiveUnit.Assert.areEqual(2000, listView.scrollPosition);

                    listView.element.parentNode.removeChild(listView.element);

                    return createListView();
                }).then(function (listView) {

                    listView.forceLayout();
                    listView.scrollPosition = 2000;

                    return Helper.ListView.waitForReady(listView)(listView);
                }).then(function (listView) {

                    LiveUnit.Assert.areEqual(2000, listView.scrollPosition);

                    listView.element.parentNode.removeChild(listView.element);

                    return createListView();
                }).then(function (listView) {

                    listView.forceLayout();
                    listView.indexOfFirstVisible = 30;

                    return Helper.ListView.waitForReady(listView)(listView);
                }).then(function (listView) {

                    LiveUnit.Assert.areEqual(30, listView.indexOfFirstVisible);
                    listView.element.parentNode.removeChild(listView.element);

                    return createListView();
                }).then(function (listView) {

                    listView.scrollPosition = 2000;
                    listView.indexOfFirstVisible = 30;

                    return Helper.ListView.waitForReady(listView)(listView);
                }).then(function (listView) {

                    LiveUnit.Assert.areEqual(30, listView.indexOfFirstVisible);
                    listView.element.parentNode.removeChild(listView.element);

                    return createListView();
                }).then(function (listView) {

                    listView.indexOfFirstVisible = 30;
                    listView.scrollPosition = 2000;

                    return Helper.ListView.waitForReady(listView)(listView);
                }).then(function (listView) {

                    LiveUnit.Assert.areEqual(2000, listView.scrollPosition);
                    listView.element.parentNode.removeChild(listView.element);

                    complete();
                });
        };

        testIndexOfFirstVisible = function (complete) {

            function test(layoutName, count, firstVisible, lastVisible) {
                LiveUnit.LoggingCore.logComment("testing " + layoutName + " layout with " + count + " items");
                var element = document.createElement("div");
                element.style.width = "300px";
                element.style.height = "350px";
                testRootEl.appendChild(element);

                var items = [];
                for (var i = 0; i < count; i++) {
                    items.push({
                        label: "Item" + i
                    });
                }
                var list = new WinJS.Binding.List(items);

                var listView = new WinJS.UI.ListView(element, {
                    itemDataSource: list.dataSource,
                    layout: new WinJS.UI[layoutName](),
                    itemTemplate: function (itemPromise) {
                        return itemPromise.then(function (item) {
                            var element = document.createElement("div");
                            element.style.width = "100px";
                            element.style.height = "100px";
                            element.textContent = item.data.label;
                            return element;
                        });
                    }
                });

                return new WinJS.Promise(function (complete) {
                    function checkAndExecute() {
                        if (listView.loadingState === "complete") {

                            LiveUnit.Assert.areEqual(firstVisible, listView.indexOfFirstVisible);
                            LiveUnit.Assert.areEqual(lastVisible, listView.indexOfLastVisible);

                            listView.removeEventListener("loadingstatechanged", checkAndExecute, false);
                            testRootEl.removeChild(element);
                            complete();
                        }
                    }

                    listView.addEventListener("loadingstatechanged", checkAndExecute, false);
                    checkAndExecute();
                });
            }

            var tests = [
                ["GridLayout", 0, -1, -1],
                ["GridLayout", 1, 0, 0],
                ["GridLayout", 5, 0, 4],
                ["GridLayout", 100, 0, 8],
                ["ListLayout", 0, -1, -1],
                ["ListLayout", 1, 0, 0],
                ["ListLayout", 2, 0, 1],
                ["ListLayout", 100, 0, 3],
            ];

            function runTest(i): WinJS.Promise<any> {
                if (i < tests.length) {
                    var parameters = tests[i];
                    return test(parameters[0], parameters[1], parameters[2], parameters[3]).then(function () {
                        runTest(i + 1);
                    })
                } else {
                    return WinJS.Promise.wrap();
                }
            }

            runTest(0).then(complete);
        };

        testCSSChange = function (complete) {

            function test(layoutName, index, beforeLeft, beforeTop, afterLeft, afterTop) {
                var element = document.createElement("div");
                element.style.width = "300px";
                element.style.height = "350px";
                testRootEl.appendChild(element);

                var items = [];
                for (var i = 0; i < 10; i++) {
                    items.push({
                        label: "Tile" + i
                    });
                }
                var list = new WinJS.Binding.List(items);

                var listView = new WinJS.UI.ListView(element, {
                    itemDataSource: list.dataSource,
                    layout: new WinJS.UI[layoutName](),
                    itemTemplate: function (itemPromise) {
                        return itemPromise.then(function (item) {
                            var element = document.createElement("div");
                            element.className = "cssChangeItem";
                            element.textContent = item.data.label;
                            return element;
                        });
                    }
                });

                return new WinJS.Promise(function (complete) {
                    Helper.ListView.runTests(listView, [
                        function () {
                            checkTile(listView, index, beforeLeft, beforeTop);
                            WinJS.Utilities.addClass(element, "cssChangeBigger");
                            listView.forceLayout();
                        },
                        function () {
                            checkTile(listView, index, afterLeft, afterTop);
                            testRootEl.removeChild(element);
                            complete();
                        }
                    ]);
                });
            }


            test("GridLayout", 1, 0, 100, 200, 0).then(function () {
                return test("ListLayout", 1, 0, 100, 0, 200);
            }).then(complete);
        };

        testRestoringScrollpos = function (complete) {

            function test(layoutName, functionName) {
                var element = document.createElement("div");
                element.style.width = "300px";
                element.style.height = "350px";
                testRootEl.appendChild(element);

                var items = [];
                for (var i = 0; i < 100; i++) {
                    items.push({
                        label: "Tile" + i
                    });
                }
                var list = new WinJS.Binding.List(items);

                var listView = new ListView(element, {
                    itemDataSource: list.dataSource,
                    layout: new WinJS.UI[layoutName](),
                    itemTemplate: function (itemPromise) {
                        return itemPromise.then(function (item) {
                            var element = document.createElement("div");
                            element.style.width = "100px";
                            element.style.height = "100px";
                            element.textContent = item.data.label;
                            return element;
                        });
                    }
                });

                return new WinJS.Promise(function (complete) {
                    Helper.ListView.runTests(listView, [
                        function () {
                            listView.scrollPosition = 300;
                            return true;
                        },
                        function () {
                            var scrollProperty = listView._horizontal() ? "scrollLeft" : "scrollTop";
                            LiveUnit.Assert.areEqual(300, WinJS.Utilities.getScrollPosition(listView._viewport)[scrollProperty]);
                            setTimeout(function () {
                                element.style.display = "none";
                                setTimeout(function () {
                                    element.style.display = "block";
                                    // Changing display property resets scrollXXX property without raising onscroll event
                                    LiveUnit.Assert.areEqual(0, WinJS.Utilities.getScrollPosition(listView._viewport)[scrollProperty]);
                                    // forceLayout restores scrollXXX
                                    listView[functionName]();
                                    listView.addEventListener("loadingstatechanged", checkAndExecute, false);

                                    function checkAndExecute() {
                                        if (listView.loadingState === "complete") {
                                            LiveUnit.Assert.areEqual(300, WinJS.Utilities.getScrollPosition(listView._viewport)[scrollProperty]);

                                            listView.removeEventListener("loadingstatechanged", checkAndExecute, false);
                                            testRootEl.removeChild(element);
                                            WinJS.UI.ListView.triggerDispose();
                                            complete();
                                        }
                                    };
                                }, 100);
                            }, 16);
                        }
                    ]);
                });
            }

            test("GridLayout", "forceLayout").then(function () {
                return test("ListLayout", "forceLayout");
            }).then(function () {
                    return test("GridLayout", "recalculateItemPosition");
                }).then(function () {
                    return test("ListLayout", "recalculateItemPosition");
                }).then(complete);
        };
    }

    var generateHeightAutoTest = function (layoutName, expectedHeight) {
        LayoutTestsExtra.prototype["testHeightAutoLayout" + layoutName] = function (complete) {
            var listView = document.createElement("div");
            listView.style.width = "384px";
            listView.style.height = "auto";
            testRootEl.appendChild(listView);
            var list = new WinJS.UI.ListView(listView, {
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (data) {
                        var el = document.createElement("div");
                        el.textContent = data.data.title;
                        el.style.height = "100px";
                        return el;
                    });
                }
            });
            list.layout = new WinJS.UI[layoutName]();
            list.layout.orientation = "horizontal";

            var bl = new WinJS.Binding.List();
            for (var i = 0; i < 100; i++) {
                bl.push({ title: "title- " + i });
            }
            list.itemDataSource = bl.dataSource;

            Helper.ListView.waitForDeferredAction(listView)().done(function () {
                LiveUnit.Assert.areEqual(expectedHeight, window.getComputedStyle(listView).height);
                testRootEl.removeChild(listView);
                complete();
            });
        }
        }

        if (WinJS.Utilities.isPhone) {
        generateHeightAutoTest("ListLayout", "108px");
        generateHeightAutoTest("GridLayout", "102px");
    } else {
        generateHeightAutoTest("ListLayout", "124px");
        generateHeightAutoTest("GridLayout", "104px");
    }

    var generateChangeLayout = function (fromLayoutName, toLayoutName) {
        LayoutTestsExtra.prototype["testChangeLayout" + (fromLayoutName == "GridLayout" ? "" : fromLayoutName)] = function (complete) {
            LiveUnit.LoggingCore.logComment("In testChangeLayout");

            var placeholder1 = document.getElementById("changeLayout1"),
                placeholder2 = document.getElementById("changeLayout2"),
                listView1 = new WinJS.UI.ListView(placeholder1, { layout: { type: WinJS.UI[fromLayoutName] } }),
                listView2 = new WinJS.UI.ListView(placeholder2, { layout: new WinJS.UI[fromLayoutName]() });

            Helper.ListView.validateListView(listView1);
            Helper.ListView.validateListView(listView2);
            LiveUnit.Assert.isTrue(listView1.layout instanceof WinJS.UI[fromLayoutName]);
            LiveUnit.Assert.isTrue(listView2.layout instanceof WinJS.UI[fromLayoutName]);

            listView2.layout = new WinJS.UI[toLayoutName]();

            LiveUnit.Assert.isTrue(listView1.layout instanceof WinJS.UI[fromLayoutName]);
            LiveUnit.Assert.isTrue(listView2.layout instanceof WinJS.UI[toLayoutName]);

            complete();
        };
    };
    generateChangeLayout("GridLayout", "ListLayout");

    var generateMetrics = function (layoutName) {
        LayoutTestsExtra.prototype["testMetrics" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            LiveUnit.LoggingCore.logComment("in testMetrics");


            var withCssClass = setupListView(document.getElementById("metricsPlaceholder"), layoutName),
                withoutCssClass = setupListView(document.getElementById("layoutTestPlaceholder"), layoutName),
                withChild = setupListView(document.getElementById("changeLayout1"), layoutName, "childTemplate");

            var promises = [
                Helper.ListView.waitForReady(withCssClass, -1)(),
                Helper.ListView.waitForReady(withoutCssClass, -1)(),
                Helper.ListView.waitForReady(withChild, -1)()
            ];

            WinJS.Promise.join(promises).then(function () {
                checkTileSize(withCssClass, 0, 135, 135);
                checkTileSize(withoutCssClass, 0, 100, 100);
                checkTileSize(withChild, 0, 100, 100);

                complete();
            });
        };
    };
    generateMetrics("GridLayout");



    var generate = function (name, layout, testFunction, itemTemplate?, placeholder?) {

        function generateTest() {
            var fullName = name + "_" + layout;
            LayoutTestsExtra.prototype[fullName] = function (complete) {
                LiveUnit.LoggingCore.logComment("in " + fullName);

                var element = document.getElementById(placeholder ? placeholder : "layoutTestPlaceholder");
                var listview = setupListView(element, layout, itemTemplate);

                testFunction(element, listview, complete);
            };
        }
        generateTest();
    }


        var testHorizontalGrid = function (element, listview, complete) {
        var tests = [
            function () {
                LiveUnit.LoggingCore.logComment("ltr tests");
                checkTile(listview, 0, 0, 0);
                checkTile(listview, 1, 0, 100);
                checkTile(listview, 3, 100, 0);
                checkTile(listview, 4, 100, 100);

                element.dir = "rtl";
                WinJS.Utilities.setScrollPosition(Helper.ListView.viewport(element), { scrollLeft: 0, scrollTop: 0 });
                return true;
            },
            function () {
                LiveUnit.LoggingCore.logComment("rtl tests");
                checkTile(listview, 0, 800, 0);
                checkTile(listview, 1, 800, 100);
                checkTile(listview, 4, 700, 100);

                element.dir = "";
                element.style.width = "550px";
                return true;
            },
            function () {
                checkTile(listview, 0, 0, 0);
                checkTile(listview, 1, 0, 100);
                checkTile(listview, 3, 100, 0);
                checkTile(listview, 4, 100, 100);

                /* TODO Uncomment when bug 372547 is fixed

                                element.style.height = "500px";
                                return true;
                            },
                            function () {
                                checkTile(listview, 1, 0, 100);
                                checkTile(listview, 4, 0, 400);
                                checkTile(listview, 5, 100, 0);
                */

                complete();
            }
        ];

        Helper.ListView.runTests(listview, tests);
    };
    generate("testHorizontalGrid", "GridLayout", testHorizontalGrid);

    var testFirstLastDisplayedInGrid = function (element, listview, complete) {
        var tests = [
            function () {
                LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(8, listview.indexOfLastVisible);

                listview.scrollPosition = 101;
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(101, WinJS.Utilities.getScrollPosition(Helper.ListView.viewport(element)).scrollLeft);
                LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(14, listview.indexOfLastVisible);

                listview.scrollPosition = 0;
                return true;
            },
            function () {
                element.style.height = "500px";
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(14, listview.indexOfLastVisible);

                listview.scrollPosition = 101;
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(5, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(24, listview.indexOfLastVisible);

                WinJS.Utilities.addClass(element, "bigMargins");
                listview.forceLayout();
                return true;
            },
            function () {
                listview.scrollPosition = 10;
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(5, listview.indexOfLastVisible);

                listview.scrollPosition = 140;
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(8, listview.indexOfLastVisible);

                listview.ensureVisible(9);
            },
            function () {
                LiveUnit.Assert.areEqual(325, listview.scrollPosition);
                listview.scrollPosition = 0;
                return true;
            },
            function () {
                element.dir = "rtl";
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(5, listview.indexOfLastVisible);

                listview.scrollPosition = 140;
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(8, listview.indexOfLastVisible);

                listview.scrollPosition = 310;
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(6, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(11, listview.indexOfLastVisible);

                listview.indexOfFirstVisible = 3;
            },
            function () {
                LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);

                complete();
            }
        ];

        Helper.ListView.runTests(listview, tests);
    };
    generate("testFirstLastDisplayedInGridLayout", "GridLayout", testFirstLastDisplayedInGrid);

    var testFirstLastDisplayedInList = function (element, listview, complete) {
        var tests = [
            function () {
                LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(2, listview.indexOfLastVisible);

                listview.scrollPosition = 101;
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(101, Helper.ListView.viewport(element).scrollTop);
                LiveUnit.Assert.areEqual(1, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(4, listview.indexOfLastVisible);

                WinJS.Utilities.addClass(element, "bigMargins");
                listview.forceLayout();
                return true;
            },
            function () {
                listview.scrollPosition = 35;
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(1, listview.indexOfLastVisible);

                listview.scrollPosition = 165;
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(1, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(2, listview.indexOfLastVisible);

                listview.indexOfFirstVisible = 4;
            },
            function () {
                LiveUnit.Assert.areEqual(4, listview.indexOfFirstVisible);

                listview.ensureVisible(5);
            },
            function () {
                LiveUnit.Assert.areEqual(650, listview.scrollPosition);

                complete();
            }
        ];

        Helper.ListView.runTests(listview, tests);
    };
    generate("testFirstLastDisplayedInListLayout", "ListLayout", testFirstLastDisplayedInList);

    var generateTestIndexOfFirstVisible = function (rtl) {
            return function (element, listview, complete) {
            var tests = [
                function () {
                    if (rtl) {
                        element.dir = "rtl";
                        return true;
                    }
                },
                function () {
                    listview.scrollPosition = 150;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(150, WinJS.Utilities.getScrollPosition(Helper.ListView.viewport(element)).scrollLeft);
                    LiveUnit.Assert.areEqual(150, listview.scrollPosition);

                    LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(14, listview.indexOfLastVisible);

                    listview.indexOfFirstVisible = 0;
                },
                function () {
                    LiveUnit.Assert.areEqual(0, WinJS.Utilities.getScrollPosition(Helper.ListView.viewport(element)).scrollLeft);
                    LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);

                    listview.indexOfFirstVisible = 1;
                },
                function () {
                    LiveUnit.Assert.areEqual(0, WinJS.Utilities.getScrollPosition(Helper.ListView.viewport(element)).scrollLeft);
                    LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);

                    listview.indexOfFirstVisible = 3;
                },
                function () {
                    LiveUnit.Assert.areEqual(100, WinJS.Utilities.getScrollPosition(Helper.ListView.viewport(element)).scrollLeft);
                    LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);

                    WinJS.Utilities.setScrollPosition(Helper.ListView.viewport(element), { scrollLeft: 150, scrollTop: 0 });
                    return true;
                },
                function () {
                    listview.ensureVisible(6);
                },
                function () {
                    LiveUnit.Assert.areEqual(150, WinJS.Utilities.getScrollPosition(Helper.ListView.viewport(element)).scrollLeft);
                    LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);

                    WinJS.Utilities.setScrollPosition(Helper.ListView.viewport(element), { scrollLeft: 150, scrollTop: 0 });
                },
                function () {
                    listview.ensureVisible(3);
                },
                function () {
                    LiveUnit.Assert.areEqual(100, WinJS.Utilities.getScrollPosition(Helper.ListView.viewport(element)).scrollLeft);
                    LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);

                    listview.ensureVisible(0);
                },
                function () {
                    LiveUnit.Assert.areEqual(0, WinJS.Utilities.getScrollPosition(Helper.ListView.viewport(element)).scrollLeft);
                    LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);

                    WinJS.Utilities.setScrollPosition(Helper.ListView.viewport(element), { scrollLeft: 150, scrollTop: 0 });
                    return true;
                },
                function () {
                    listview.ensureVisible(12);
                },
                function () {
                    LiveUnit.Assert.areEqual(200, WinJS.Utilities.getScrollPosition(Helper.ListView.viewport(element)).scrollLeft);
                    LiveUnit.Assert.areEqual(6, listview.indexOfFirstVisible);

                    WinJS.Utilities.setScrollPosition(Helper.ListView.viewport(element), { scrollLeft: 150, scrollTop: 0 });
                    return true;
                },
                function () {
                    listview.ensureVisible(15);
                },
                function () {
                    LiveUnit.Assert.areEqual(300, WinJS.Utilities.getScrollPosition(Helper.ListView.viewport(element)).scrollLeft);
                    LiveUnit.Assert.areEqual(9, listview.indexOfFirstVisible);

                    complete();
                }
            ];

            Helper.ListView.runTests(listview, tests);
        }
        };
    generate("testIndexOfFirstVisibleGridLayouT", "GridLayout", generateTestIndexOfFirstVisible(false));
    generate("testIndexOfFirstVisibleGridLayoutRTL", "GridLayout", generateTestIndexOfFirstVisible(true));

    var testIndexOfFirstVisibleOutOfRange = function (element, listview, complete) {

        Helper.initUnhandledErrors();

        Helper.ListView.waitForReady(listview)().
            then(function () {
                listview.indexOfFirstVisible = 1000;
                return WinJS.Promise.timeout();
            }).
            then(Helper.validateUnhandledErrorsOnIdle).
            done(complete);
    };

    generate("testIndexOfFirstVisibleOutOfRangeGridLayout", "GridLayout", testIndexOfFirstVisibleOutOfRange);

    var testEnsureVisibleOutOfRange = function (element, listview, complete) {

        Helper.initUnhandledErrors();

        Helper.ListView.waitForReady(listview)().
            then(function () {
                listview.ensureVisible(1000);
                return WinJS.Promise.timeout();
            }).
            then(Helper.validateUnhandledErrorsOnIdle).
            done(complete);
    };

    generate("testEnsureVisibleOutOfRangeGridLayout", "GridLayout", testEnsureVisibleOutOfRange);

    var testEnsureVisibleWithAsymmetricalMarginsInGrid = function (element, listview, complete) {
        var tests = [
            function () {
                LiveUnit.Assert.areEqual(3, listview.indexOfLastVisible);

                listview.ensureVisible(6);
            },
            function () {
                LiveUnit.Assert.areEqual(300, WinJS.Utilities.getScrollPosition(Helper.ListView.viewport(element)).scrollLeft);

                listview.ensureVisible(3);
            },
            function () {
                LiveUnit.Assert.areEqual(100, WinJS.Utilities.getScrollPosition(Helper.ListView.viewport(element)).scrollLeft);

                WinJS.Utilities.removeClass(element, "bigMargins");
                listview.forceLayout();
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(11, listview.indexOfLastVisible);
                listview.ensureVisible(12);
            },
            function () {
                LiveUnit.Assert.areEqual(200, WinJS.Utilities.getScrollPosition(Helper.ListView.viewport(element)).scrollLeft);

                WinJS.Utilities.addClass(element, "bigMargins");
                listview.forceLayout();
                return true;
            },
            function () {
                WinJS.Utilities.setScrollPosition(Helper.ListView.viewport(element), { scrollLeft: 125, scrollTop: 0 });
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(2, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(5, listview.indexOfLastVisible);

                WinJS.Utilities.setScrollPosition(Helper.ListView.viewport(element), { scrollLeft: 250, scrollTop: 0 });
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(4, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(7, listview.indexOfLastVisible);

                element.dir = "rtl";
                    return true
                },
            function () {
                WinJS.Utilities.setScrollPosition(Helper.ListView.viewport(element), { scrollLeft: 25, scrollTop: 0 });
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(3, listview.indexOfLastVisible);

                WinJS.Utilities.setScrollPosition(Helper.ListView.viewport(element), { scrollLeft: 201, scrollTop: 0 });
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(2, listview.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(7, listview.indexOfLastVisible);

                complete();
            }
        ];

        Helper.ListView.runTests(listview, tests);
    };
    generate("testEnsureVisibleWithAsymmetricalM   arginsInGridLayout", "GridLayout", testEnsureVisibleWithAsymmetricalMarginsInGrid, "asymmetricalMarginsTemplate", "asymmetricalMarginsPlaceholder");

    var testEnsureVisibleWithAsymmetricalMarginsInList = function (element, listview, complete) {
        var tests = [
            function () {
                LiveUnit.Assert.areEqual(1, listview.indexOfLastVisible);

                listview.ensureVisible(3);
            },
            function () {
                LiveUnit.Assert.areEqual(300, Helper.ListView.viewport(element).scrollTop);

                listview.ensureVisible(1);
            },
            function () {
                LiveUnit.Assert.areEqual(100, Helper.ListView.viewport(element).scrollTop);

                WinJS.Utilities.removeClass(element, "bigMargins");
                listview.forceLayout();
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(3, listview.indexOfLastVisible);
                listview.ensureVisible(4);
            },
            function () {
                LiveUnit.Assert.areEqual(200, Helper.ListView.viewport(element).scrollTop);

                complete();
            }
        ];

        Helper.ListView.runTests(listview, tests);
    };
    generate("testEnsureVisibleWithAsymmetricalMarginsInListLayout", "ListLayout", testEnsureVisibleWithAsymmetricalMarginsInList, "asymmetricalMarginsTemplate", "asymmetricalMarginsPlaceholder");

    var testLeadingMargin = function (element, listview, complete) {
        var tests = [
            function () {
                checkTile(listview, 0, 0, 0);
                checkTile(listview, 1, 0, 100);
                checkTile(listview, 3, 110, 0);

                listview.ensureVisible(20);
            },
            function () {
                listview.ensureVisible(1);
            },
            function () {
                LiveUnit.Assert.areEqual(0, WinJS.Utilities.getScrollPosition(Helper.ListView.viewport(element)).scrollLeft);

                listview.ensureVisible(20);
            },
            function () {
                listview.indexOfFirstVisible = 0;
            },
            function () {
                LiveUnit.Assert.areEqual(0, WinJS.Utilities.getScrollPosition(Helper.ListView.viewport(element)).scrollLeft);

                complete();
            }
        ];

        Helper.ListView.runTests(listview, tests);
    };
    generate("testLeadingMarginGridLayout", "GridLayout", testLeadingMargin, "leadingMarginTemplate", "leadingMarginPlaceholder");

    var testMaxRows = function (element, listview, complete) {
        var tests = [
            function () {
                checkTile(listview, 0, 0, 0);
                checkTile(listview, 1, 0, 100);
                checkTile(listview, 2, 0, 200);
                checkTile(listview, 3, 100, 0);
                checkTile(listview, 4, 100, 100);
                checkTile(listview, 5, 100, 200);

                listview.layout.maxRows = 2;
            },
            function () {
                checkTile(listview, 0, 0, 0);
                checkTile(listview, 1, 0, 100);
                checkTile(listview, 2, 100, 0);
                checkTile(listview, 3, 100, 100);
                checkTile(listview, 4, 200, 0);
                checkTile(listview, 5, 200, 100);

                complete();
            }
        ];

        Helper.ListView.runTests(listview, tests);
    };
    generate("testMaxRows", "GridLayout", testMaxRows);

    var testMaximumRowsOrColumnsHorizontal = function (element, listview, complete) {
        var tests = [
            function () {
                checkTile(listview, 0, 0, 0);
                checkTile(listview, 1, 0, 100);
                checkTile(listview, 2, 0, 200);
                checkTile(listview, 3, 100, 0);
                checkTile(listview, 4, 100, 100);
                checkTile(listview, 5, 100, 200);

                listview.layout.maximumRowsOrColumns = 2;
            },
            function () {
                checkTile(listview, 0, 0, 0);
                checkTile(listview, 1, 0, 100);
                checkTile(listview, 2, 100, 0);
                checkTile(listview, 3, 100, 100);
                checkTile(listview, 4, 200, 0);
                checkTile(listview, 5, 200, 100);

                complete();
            }
        ];

        Helper.ListView.runTests(listview, tests);
    };
    generate("testMaximumRowsOrColumnsHorizontal", "GridLayout", testMaximumRowsOrColumnsHorizontal);
    if (Helper.Browser.supportsCSSGrid) {
        generate("testMaximumRowsOrColumnsHorizontal", "CellSpanningLayout", testMaximumRowsOrColumnsHorizontal);
    }

    var testMaximumRowsOrColumnsVertical = function (element, listview, complete) {
        listview.layout.orientation = "vertical";
        var tests = [
            function () {
                var columnSpacing = WinJS.Utilities.isPhone ? 29 : 31;
                checkTile(listview, 0, 0, 0);
                checkTile(listview, 1, columnSpacing, 0);
                checkTile(listview, 2, 2 * columnSpacing, 0);
                checkTile(listview, 3, 3 * columnSpacing, 0);
                checkTile(listview, 4, 4 * columnSpacing, 0);
                checkTile(listview, 5, 5 * columnSpacing, 0);

                listview.layout.maximumRowsOrColumns = 2;
            },
            function () {
                var columnSpacing = WinJS.Utilities.isPhone ? 29 : 31;
                checkTile(listview, 0, 0, 0);
                checkTile(listview, 1, columnSpacing, 0);
                checkTile(listview, 2, 0, 100);
                checkTile(listview, 3, columnSpacing, 100);
                checkTile(listview, 4, 0, 200);
                checkTile(listview, 5, columnSpacing, 200);

                complete();
            }
        ];

        Helper.ListView.runTests(listview, tests);
    };
    generate("testMaximumRowsOrColumnsVertical", "GridLayout", testMaximumRowsOrColumnsVertical);

    function createDataSource(data, requests) {
        var dataSource = {
            itemsFromIndex: function (index, countBefore, countAfter) {
                return new WinJS.Promise(function (complete, error) {
                    if (index >= 0 && index < data.length) {
                        var startIndex = Math.max(0, index - countBefore),
                            endIndex = Math.min(index + countAfter, data.length - 1),
                            size = endIndex - startIndex + 1;

                        var items = [];
                        for (var i = startIndex; i < startIndex + size; i++) {
                            items.push({
                                key: i.toString(),
                                data: data[i]
                            });
                            requests.push(i);
                        }

                        var retVal = {
                            items: items,
                            offset: index - startIndex,
                            totalCount: data.length,
                            absoluteIndex: index
                        };

                        complete(retVal);
                    } else {
                        complete({});
                    }
                });
            },

            getCount: function () {
                return WinJS.Promise.wrap(data.length);
            }
        };

        return new WinJS.UI.ListDataSource(dataSource);
    }

    var generateRecalculateItemPosition = function (layoutName) {
        LayoutTestsExtra.prototype["testRecalculateItemPosition" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "350px";
            testRootEl.appendChild(element);

            var items = [];
            for (var i = 0; i < 10; i++) {
                items.push({
                    label: "Tile" + i
                });
            }
            var list = new WinJS.Binding.List(items);

            var listView = new WinJS.UI.ListView(element, {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: list.dataSource,
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("div");
                        element.className = "cssChangeItem";
                        element.textContent = item.data.label;
                        return element;
                    });
                }
            });

            Helper.ListView.runTests(listView, [
                function () {
                    checkTile(listView, 1, 0, 100);
                    var tile = listView.elementFromIndex(1);
                    tile.style.backgroundColor = "rgb(255, 192, 203)";
                    WinJS.Utilities.addClass(element, "cssChangeBigger");
                    listView.recalculateItemPosition();
                },
                function () {
                    checkTile(listView, 1, 200, 0);
                    var tile = listView.elementFromIndex(1);
                    // recalculateItemPosition should not re-create elements so pink color should be still there
                    LiveUnit.Assert.areEqual("rgb(255, 192, 203)", tile.style.backgroundColor);
                    testRootEl.removeChild(element);
                    complete();
                }
            ]);
        };
    };
    generateRecalculateItemPosition("GridLayout");


    if (!Helper.Browser.isIE11) {
        Helper.disableTest(LayoutTestsExtra, "testFirstLastDisplayedInGridLayout_GridLayout");
        Helper.disableTest(LayoutTestsExtra, "testHeightAutoLayoutGridLayout");
        Helper.disableTest(LayoutTestsExtra, "testHeightAutoLayoutListLayout");
        Helper.disableTest(LayoutTestsExtra, "testRestoringScrollpos");
    }

}



// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.LayoutTestsExtra");