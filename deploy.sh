#!/bin/bash

$ERRORSTRING="Error. Please make sure you've indicated correct parameters"

if [ $# -eq 0 ]
    then
        echo $ERRORSTRING;
elif [ $1 == "live" ]
    then
        if [[ -z $2 ]]
            then
                echo "Running dry-run"
                rsync --dry-run -az --force --delete --progress --exclude-from=rsync_exclude.txt -e "ssh -p22" ./ root@120.25.203.158:/var/www/nodesites/gps
        elif [ $2 == "go" ]
            then
                echo "Running actual deploy"
                rsync -az --force --delete --progress --exclude-from=rsync_exclude.txt -e "ssh -p22" ./ root@120.25.203.158:/var/www/nodesites/gps
        elif [ $2 == "all" ]
            then 
                echo "deploying all"
                rsync -az --force --delete --progress -e "ssh -p22" ./ root@120.25.203.158:/var/www/nodesites/gps                
        else
            echo $ERRORSTRING;
        fi
fi

