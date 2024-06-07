library(rmarkdown)
library(magrittr)
library(networkD3)


# Plot


links = read.table("links.txt")
nodes = read.table("nodes.txt")
weblinks <- c(read.table("hyperlinks.txt"))

ColourScale <- 'd3.scaleOrdinal()
            .domain(["1", "2", "3", "4", "5"])
            .range(["#000000", "#d6d2d2", "#79addc", "#9e1910", "#8e20c1"]);'

fn <- forceNetwork(Links = links, Nodes = nodes,
             Source = "source", Target = "target",
             Value = "value", NodeID = "name",
             Group = "group", opacity = 1., linkDistance = 24,
             colourScale = ColourScale, fontSize = 12, bounded = TRUE,
             charge = -65, radiusCalculation = JS(" Math.sqrt(d.nodesize)+6"))
fn$x$nodes$hyperlink <- weblinks
fn$x$options$clickAction = 'window.open(d.hyperlink)'

fn%>%
  saveNetwork(file = 'network.html')
