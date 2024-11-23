#!/bin/bash

# Create project directory
project_name="CarDealerShowroomManagement"
mkdir $project_name
cd $project_name

# Create directory for Maven project structure
mkdir -p src/main/java/com/cardealer
mkdir -p src/main/resources
mkdir -p src/test/java/com/cardealer
mkdir -p target

# Create pom.xml file
cat <<EOL > pom.xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.cardealer</groupId>
    <artifactId>CarDealerShowroomManagement</artifactId>
    <version>1.0-SNAPSHOT</version>
    
    <properties>
        <maven.compiler.source>1.8</maven.compiler.source>
        <maven.compiler.target>1.8</maven.compiler.target>
    </properties>

    <dependencies>