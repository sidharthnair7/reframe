package fileidea.reframe.graph;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public  class ActionPlan {


        private String framework;
        private List<String> steps;
        private String timeEstimate;
        private String urgencyNote;
   }


