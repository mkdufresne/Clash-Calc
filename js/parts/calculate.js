part('calculate', [
    'storage',
    'types',
    'dom',
    'goal'
], function(storage, types, dom, goal) {

    'use strict';

    var BOOSTED_MULTIPLIER = 4;

    var typesSorted = {};
    Object.keys(types.data).forEach(function(type) {
        typesSorted[type] = [];
        Object.keys(types.data[type]).forEach(function(name) {
            typesSorted[type].unshift(types.data[type][name].concat(name));
        });
    });
    typesSorted.dark.sort(function(a, b) {
        return b[2] - a[2];
    });

    var suitableBarracksSort = function(a, b) {
        // minimum time first
        var aTime = a.getActualTime();
        var bTime = b.getActualTime();
        if (aTime < bTime) {
            return -1;
        }
        if (aTime > bTime) {
            return 1;
        }

        // minimum space first
        if (a.space < b.space) {
            return -1;
        }
        if (a.space > b.space) {
            return 1;
        }

        // minimum max space first
        if (a.maxSpace < b.maxSpace) {
            return -1;
        }
        if (a.maxSpace > b.maxSpace) {
            return 1;
        }

        return 0;
    };


    var barracksMinLevelSort = function(a, b) {
        // minimum level first
        if (a.level < b.level) {
            return -1;
        }
        if (a.level > b.level) {
            return 1;
        }

        return suitableBarracksSort(a, b);
    };

    var getSuitableBarrack = function(barracksQueue,
                                      requiredLevel,
                                      requiredSpace,
                                      requiredTime,
                                      avgTime) {
        var suitable = barracksQueue.filter(function(barrack) {
            return barrack.level >= requiredLevel && (barrack.space + requiredSpace) <= barrack.maxSpace;
        });

        if (!suitable.length) {
            return null;
        }

        if (suitable.length > 1) {
            if (requiredSpace === 1) {
                var timeSuitable = suitable.filter(function(barrack) {
                    return (barrack.time + requiredTime) <= barrack.getAverageTime(avgTime);
                });
                if (timeSuitable.length) {
                    if (timeSuitable.length > 1) {
                        timeSuitable.sort(barracksMinLevelSort);
                    }
                    return timeSuitable[0];
                }
            }

            suitable.sort(suitableBarracksSort);
        }

        return suitable[0];
    };

    var fillBarracks = function(barracksQueue, unitsDistribution, avgTime, activeCount) {
        var isSuitedForEqual = true;

        var maxUnitLevel = 0;
        var totalUnitsSpace = 0;
        unitsDistribution.forEach(function(kit) {
            if (isSuitedForEqual && kit[1] % activeCount !== 0) {
                isSuitedForEqual = false;
            }

            maxUnitLevel = Math.max(kit[2], maxUnitLevel);
            totalUnitsSpace += kit[1] * kit[4];
        });

        var isAllBarracksSimilar = true;
        var totalBarracksSpace = 0;
        var barracksNums = [];
        barracksQueue.forEach(function(barrack) {
            if (barrack.level !== 0) {
                var boostedLikeFirst = (barrack.isBoosted === barracksQueue[0].isBoosted);
                if (isSuitedForEqual && !(barrack.level >= maxUnitLevel && boostedLikeFirst)) {
                    isSuitedForEqual = false;
                }

                if (isSuitedForEqual && (totalUnitsSpace / activeCount) > barrack.maxSpace) {
                    isSuitedForEqual = false;
                }

                if (isAllBarracksSimilar && !(barrack.level === barracksQueue[0].level && boostedLikeFirst)) {
                    isAllBarracksSimilar = false;
                }

                barracksNums.push(barrack.num);

                totalBarracksSpace += barrack.maxSpace;
            }
        });

        isSuitedForEqual = (isSuitedForEqual && totalBarracksSpace >= totalUnitsSpace);

        var stopDistribution = false;

        while (unitsDistribution.length) {
            var kit = unitsDistribution.shift();
            var kitIndex = kit[0];
            var kitQuantity = kit[1];
            var kitLevel = kit[2];
            var kitTime = kit[3];
            var kitSpace = kit[4];

            if (isSuitedForEqual) {
                var quantityPerBarrack = kitQuantity / activeCount;
                var timePerBarrack = quantityPerBarrack * kitTime;
                var spacePerBarrack = quantityPerBarrack * kitSpace;

                barracksQueue.forEach(function(barrack) {
                    if (barrack.level !== 0) {
                        barrack.units[kitIndex] = quantityPerBarrack;
                        barrack.time += timePerBarrack;
                        barrack.space += spacePerBarrack;
                    }
                });
            } else {
                var barrack = null;
                while (kitQuantity--) {
                    var isGetBarrack = true;
                    if (barrack) {
                        var newTime = barrack.time + kitTime;
                        var newSpace = barrack.space + kitSpace;
                        if (kitSpace === 1 && newTime <= barrack.getAverageTime(avgTime) && newSpace <= barrack.maxSpace) {
                            isGetBarrack = false;
                        }
                    }

                    if (isGetBarrack) {
                        barrack = getSuitableBarrack(
                            barracksQueue,
                            kitLevel,
                            kitSpace,
                            kitTime,
                            avgTime
                        );
                    }

                    if (barrack === null) {
                        stopDistribution = true;
                        break;
                    }

                    if (barrack.units[kitIndex]) {
                        barrack.units[kitIndex]++;
                    } else {
                        barrack.units[kitIndex] = 1;
                    }

                    barrack.time += kitTime;
                    barrack.space += kitSpace;
                }
            }
        }

        if (!stopDistribution && isAllBarracksSimilar && !isSuitedForEqual) {
            barracksQueue.sort(function(a, b) {
                return b.getActualTime() - a.getActualTime();
            });
            barracksQueue.forEach(function(barrack, index) {
                if (barrack.level !== 0) {
                    barrack.num = barracksNums[index];
                }
            });
        }

        return !stopDistribution;
    };

    var calculateItems = function(type, params) {
        var levelValue;
        if (['light-spells', 'dark-spells'].indexOf(type) !== -1) {
            levelValue = params.storage.get(type + '-level', 0);
        } else {
            var levels = [];
            var i = 0;
            while (++i <= types.buildings[type].count) {
                levels.push(params.storage.get(type + '-level-' + i, 0));
            }
            levelValue = Math.max.apply(null, levels);
        }

        var typeResult = {
            'capLevel': params.capLevel,
            'levelValue': levelValue,
            'objects': []
        };

        var totalCost = 0;
        var subtractedCost = 0;
        var totalSpace = 0;
        var totalTime = 0;
        var maxUnitTime = 0;
        var distribution = [];

        var tsIndex = -1; // ts - types sorted
        var tsLength = typesSorted[type].length;
        while (++tsIndex < tsLength) {
            var objectResult = {};

            var value = typesSorted[type][tsIndex];
            if (value[3] > levelValue) {
                continue;
            }

            var name = value[5];

            var quantity = params.storage.get(name, 0);
            var level = params.storage.get(name + '-level', 0);
            var costPerItem = value[1][level];
            var summaryCost = (costPerItem * quantity);

            objectResult.name = name;
            objectResult.summaryCost = summaryCost;
            objectResult.level = level;
            objectResult.minBarrackLevel = value[3];

            totalCost += summaryCost;

            totalSpace += (value[2] * quantity);
            if (['light-spells', 'dark-spells'].indexOf(type) !== -1) {
                totalTime += (value[0] * quantity);
            } else {
                var subtractQuantity = 0;
                if (params.current) {
                    subtractQuantity = parseInt(dom.id(name + '-subtract').value, 10) || 0;
                }

                if (subtractQuantity) {
                    goal.reach('SUBTRACT');
                }

                quantity -= subtractQuantity;
                if (quantity < 0) {
                    quantity = 0;
                }
                if (quantity) {
                    distribution.push([
                        tsIndex, // 0
                        quantity, // 1
                        value[3], // 2 - level
                        value[0], // 3 - time
                        value[2] // 4 - space
                    ]);
                    maxUnitTime = Math.max(maxUnitTime, value[0]);
                    totalTime += (value[0] * quantity);
                }

                subtractedCost += (costPerItem * quantity);

            }
            objectResult.quantity = quantity;

            typeResult.objects.push(objectResult);
        }
        typeResult.typesSorted = typesSorted[type];

        typeResult.totalCost = totalCost;
        typeResult.totalSpace = totalSpace;

        if (['light-spells', 'dark-spells'].indexOf(type) !== -1) {
            typeResult.totalTime = totalTime;
        } else {
            var barracksQueue = levels.map(function(level, index) {
                var num = index + 1;

                var isBoosted = false;
                if (params.current) {
                    isBoosted = localStorage.getItem(type + '-boosted-' + num) === 'yes';
                }

                return {
                    'num': num,
                    'time': 0,
                    'space': 0,
                    'maxSpace': types.buildings[type].queue[level],
                    'units': {},
                    'level': level,
                    'isBoosted': isBoosted,
                    'getActualTime': function() {
                        if (this.isBoosted) {
                            return Math.floor(this.time / BOOSTED_MULTIPLIER);
                        }

                        return this.time;
                    },
                    'getAverageTime': function(averageTime) {
                        if (this.isBoosted) {
                            return averageTime * BOOSTED_MULTIPLIER;
                        }

                        return averageTime;
                    }
                };
            });

            var boostedCount = barracksQueue.filter(function(barrack) {
                return barrack.isBoosted === true;
            }).length;

            if (boostedCount) {
                maxUnitTime = Math.ceil(maxUnitTime / BOOSTED_MULTIPLIER);
            }

            var activeCount = barracksQueue.filter(function(barrack) {
                return barrack.level > 0;
            }).length;
            var virtualBarracksCount = activeCount + (boostedCount * (BOOSTED_MULTIPLIER - 1));
            var avgTime = Math.max(Math.ceil(totalTime / virtualBarracksCount), maxUnitTime);

            var avgTimeCorrection = avgTime % 5;
            if (avgTimeCorrection !== 0) {
                avgTime += (5 - avgTimeCorrection);
            }

            typeResult.fillSuccess = fillBarracks(barracksQueue, distribution, avgTime, activeCount);
            typeResult.barracksQueue = barracksQueue;
            typeResult.subtractedCost = subtractedCost;
        }

        return typeResult;
    };

    var calculate = function(params) {
        var result = {
            'params': params
        };

        result.armyCampsSpace = params.storage.get('army-camps', 0);

        ['light', 'dark', 'light-spells', 'dark-spells'].forEach(function(type) {
            result[type] = calculateItems(type, {
                'storage': params.storage,
                'current': params.current,
                'capLevel': types.buildings[type].maxLevel
            });
        });

        return result;
    };

    return calculate;
});