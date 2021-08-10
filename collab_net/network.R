library(rmarkdown)
library(magrittr)
library(networkD3)


# Plot


links = read.table("links.txt")
nodes = read.table("nodes.txt")
weblinks <- c(read.table("hyperlinks.txt"))

ColourScale <- 'd3.scaleOrdinal()
            .domain(["1", "2", "3", "4", "5"])
            .range(["#000000", "#9BA1A6", "#dbbb2a", "#9e1910", "#8e20c1"]);'

fn <- forceNetwork(Links = links, Nodes = nodes,
             Source = "source", Target = "target",
             Value = "value", NodeID = "name",
             Group = "group", opacity = 1.,
             colourScale = ColourScale, fontSize = 12, bounded = TRUE)
fn$x$nodes$hyperlink <- weblinks
fn$x$options$clickAction = 'window.open(d.hyperlink)'

fn%>%
  saveNetwork(file = 'network.html')

library(visNetwork)

names(links) <- c("from","to","value")


nodes$id <- 0:(nrow(nodes)-1)
nodes$label <- c("name")

vn <- visNetwork(nodes=nodes, edges=links) %>% 
  visInteraction(zoomView = FALSE)

vn.on("hoverNode", function (params) {
        network.canvas.body.container.style.cursor = 'pointer'
 });

vn.on("blurNode", function (params) {
        network.canvas.body.container.style.cursor = 'default'
 });

vn%>%
  saveNetwork(file = 'network2.html')
