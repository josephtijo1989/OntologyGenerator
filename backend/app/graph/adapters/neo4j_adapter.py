import socket
from typing import Dict, Any, List
from app.graph.adapters.base import BaseGraphAdapter
from app.utilities.logger import logger


class Neo4jAdapter(BaseGraphAdapter):
    """
    Neo4j Target Graph Database Adapter using official neo4j Python driver & socket fallback.
    """
    def __init__(self, connection_params: Dict[str, Any]):
        super().__init__(connection_params)
        raw_host = str(self.params.get('host') or '127.0.0.1')
        clean_host = raw_host.replace("bolt://", "").replace("neo4j://", "").replace("http://", "").replace("https://", "").split(":")[0]
        port = self.params.get('port') or 7687

        if raw_host.startswith("bolt://") or raw_host.startswith("bolt+s://") or raw_host.startswith("neo4j://") or raw_host.startswith("neo4j+s://"):
            self.uri = raw_host
        else:
            self.uri = f"bolt://{clean_host}:{port}"

        self.clean_host = clean_host or "127.0.0.1"
        self.port = int(port)
        self.database = self.params.get('database_name') or 'neo4j'
        self.username = self.params.get('username') or 'neo4j'
        self.password = self.params.get('password') or ''

    def _get_driver(self, uri_override: str = None):
        import neo4j
        u = uri_override or self.uri
        if self.username and self.password:
            auth = neo4j.basic_auth(self.username, self.password)
        else:
            auth = None
        return neo4j.GraphDatabase.driver(u, auth=auth)

    def test_connection(self) -> bool:
        # Step 1: Check raw TCP socket connectivity
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2.0)
            result = sock.connect_ex((self.clean_host, self.port))
            sock.close()
            if result != 0:
                logger.info(f"Target Graph port {self.clean_host}:{self.port} is closed/unreachable.")
                return False
        except Exception as se:
            logger.info(f"Socket test exception for {self.clean_host}:{self.port}: {se}")
            return False

        # Step 2: Test driver sessions (Try bolt:// first for standalone local instances)
        uris = [
            f"bolt://{self.clean_host}:{self.port}",
            f"neo4j://{self.clean_host}:{self.port}",
            self.uri
        ]
        seen_uris = set()
        for u in uris:
            if u in seen_uris:
                continue
            seen_uris.add(u)
            try:
                with self._get_driver(u) as driver:
                    with driver.session(database=self.database) as session:
                        res = session.run("RETURN 1 AS num")
                        record = res.single()
                        if record is not None and record["num"] == 1:
                            self.uri = u
                            logger.info(f"Successfully connected to Neo4j database '{self.database}' at {u}")
                            return True
            except Exception as e:
                logger.warning(f"Neo4j driver attempt failed for {u} (database: {self.database}): {e}")

        # Step 3: Fallback session test without specifying database_name
        for u in seen_uris:
            try:
                with self._get_driver(u) as driver:
                    with driver.session() as session:
                        res = session.run("RETURN 1 AS num")
                        record = res.single()
                        if record is not None and record["num"] == 1:
                            self.uri = u
                            logger.info(f"Successfully connected to Neo4j (default session) at {u}")
                            return True
            except Exception as e:
                pass

        return False

    def create_nodes(self, nodes: List[Dict[str, Any]]) -> bool:
        if not nodes:
            return True
        try:
            with self._get_driver() as driver:
                with driver.session(database=self.database) as session:
                    for node in nodes:
                        label = node.get("label", "Entity")
                        props = node.get("properties", {})
                        node_id = props.get("id") or props.get("code") or str(props)
                        query = f"MERGE (n:{label} {{id: $id}}) SET n += $props"
                        session.run(query, id=node_id, props=props)
            return True
        except Exception as e:
            logger.error(f"Failed to create nodes in Neo4j: {e}")
            return False

    def create_relationships(self, relationships: List[Dict[str, Any]]) -> bool:
        if not relationships:
            return True
        try:
            with self._get_driver() as driver:
                with driver.session(database=self.database) as session:
                    for rel in relationships:
                        from_lbl = rel.get("from_label", "Entity")
                        from_id = rel.get("from_id")
                        rel_type = rel.get("rel", "RELATED_TO")
                        to_lbl = rel.get("to_label", "Entity")
                        to_id = rel.get("to_id")
                        query = (
                            f"MATCH (a:{from_lbl} {{id: $from_id}}), (b:{to_lbl} {{id: $to_id}}) "
                            f"MERGE (a)-[r:{rel_type}]->(b)"
                        )
                        session.run(query, from_id=from_id, to_id=to_id)
            return True
        except Exception as e:
            logger.error(f"Failed to create relationships in Neo4j: {e}")
            return False

    def execute_cypher(self, query: str, parameters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        try:
            with self._get_driver() as driver:
                with driver.session(database=self.database) as session:
                    res = session.run(query, parameters or {})
                    return [record.data() for record in res]
        except Exception as e:
            logger.error(f"Failed to execute Cypher query: {e}")
            raise e
